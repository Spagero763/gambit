import { randomUUID } from "node:crypto";
import { formatUnits, parseUnits } from "viem";
import { celo } from "viem/chains";
import { supabaseAdmin } from "@/lib/supabase";
import { notify } from "@/lib/server/push";
import { decimalsForToken, symbolForToken, tokensFor, USDM_ADDRESS } from "@/lib/tokens";
import { OWNER_ADDRESS } from "@/lib/owner";
import {
  landed,
  receiptOf,
  sendRaw,
  sendToken,
  signTransfer,
  transferGas,
  treasuryBalances,
  treasuryConfigured,
  treasuryFees,
  treasuryNonce,
} from "@/lib/server/treasury";

// A decided money match pays a 5% fee on the pot, which is 10% of one entry.
// A tenth of that fee goes back to each player as cashback and a tenth to each
// player's inviter: 1% of an entry each, at most 40% of the fee. It is paid out
// of fees the same match already paid, so it can't cost more than it earns, and
// playing your own second wallet always loses money.
const FEE_BPS = BigInt(500);
const SHARE_BPS = BigInt(1000);
const ZERO = BigInt(0);
export const PAYOUT_MIN = 0.1;
// a payout this old that the chain has never heard of is not coming
const STALE_MS = 10 * 60_000;

export interface SettledMatch {
  id: number | string;
  creator: string | null;
  opponent: string | null;
  winner: string | null;
  stake: string | null;
  token?: string | null;
}

interface RewardRow {
  match_id: number;
  address: string;
  kind: "cashback" | "referral";
  source: string;
  token: string;
  amount: string;
}

/** Record the rewards a settled match earned. Never throws: settlement must not depend on it. */
export async function creditRewards(m: SettledMatch): Promise<void> {
  try {
    if (!m.winner) return; // a draw refunds both entries and takes no fee
    const stake = BigInt(m.stake || "0");
    const share = (stake * BigInt(2) * FEE_BPS * SHARE_BPS) / BigInt(100_000_000);
    if (share <= ZERO) return;
    const seats = [m.creator, m.opponent].map((s) => s?.toLowerCase()).filter(Boolean) as string[];
    if (seats.length !== 2) return;
    const token = (m.token || USDM_ADDRESS).toLowerCase();
    const db = supabaseAdmin();

    const { data: profs } = await db.from("profiles").select("address,referred_by,banned").in("address", seats);
    const prof = Object.fromEntries((profs ?? []).map((p: any) => [p.address, p]));
    const rows: RewardRow[] = [];
    for (const p of seats) {
      if (prof[p]?.banned) continue;
      const base = { match_id: Number(m.id), token, amount: share.toString(), source: p };
      rows.push({ ...base, address: p, kind: "cashback" });
      const inviter = (prof[p]?.referred_by as string | null)?.toLowerCase();
      // being invited by the person you're playing is the cheapest farm there is
      if (inviter && inviter !== p && !seats.includes(inviter)) rows.push({ ...base, address: inviter, kind: "referral" });
    }

    const inviters = rows.filter((r) => r.kind === "referral").map((r) => r.address);
    let banned = new Set<string>();
    if (inviters.length) {
      const { data } = await db.from("profiles").select("address").in("address", inviters).eq("banned", true);
      banned = new Set((data ?? []).map((r: any) => r.address));
    }
    const keep = rows.filter((r) => !(r.kind === "referral" && banned.has(r.address)));
    if (keep.length) await db.from("rewards").upsert(keep, { onConflict: "match_id,address,kind,source", ignoreDuplicates: true });
  } catch {
    /* a missed row costs a player a cent; a thrown error here would cost a payout */
  }
}

const usd = (amount: string | bigint, token: string) => Number(formatUnits(BigInt(amount), decimalsForToken(token)));

/** What one wallet has earned: cashback and invites, waiting and paid, plus who earned it for them. */
export async function rewardsSummary(address: string) {
  const db = supabaseAdmin();
  const { data } = await db
    .from("rewards")
    .select("kind,source,token,amount,paid_at")
    .eq("address", address.toLowerCase())
    .limit(10000);
  const sum = { cashback: { waiting: 0, paid: 0 }, referral: { waiting: 0, paid: 0 } };
  const byFriend: Record<string, number> = {};
  for (const r of (data ?? []) as any[]) {
    const v = usd(r.amount, r.token);
    sum[r.kind as "cashback" | "referral"][r.paid_at ? "paid" : "waiting"] += v;
    if (r.kind === "referral") byFriend[r.source] = (byFriend[r.source] ?? 0) + v;
  }
  const round = (n: number) => Number(n.toFixed(4));
  return {
    cashback: { waiting: round(sum.cashback.waiting), paid: round(sum.cashback.paid) },
    referral: { waiting: round(sum.referral.waiting), paid: round(sum.referral.paid) },
    byFriend: Object.fromEntries(Object.entries(byFriend).map(([k, v]) => [k, round(v)])),
    minimum: PAYOUT_MIN,
  };
}

/** Rewards not yet confirmed paid, per token (base units). Counts transfers still in flight. */
export async function rewardsOwed(): Promise<Record<string, bigint>> {
  const db = supabaseAdmin();
  const { data } = await db.from("rewards").select("token,amount").is("paid_at", null).limit(50000);
  const owed: Record<string, bigint> = {};
  for (const r of (data ?? []) as any[]) owed[r.token] = (owed[r.token] ?? ZERO) + BigInt(r.amount);
  return owed;
}

type Db = ReturnType<typeof supabaseAdmin>;

/**
 * Settle earlier payouts against the chain. A transfer that landed is marked
 * paid; one that reverted, or whose nonce went to another transfer, can never
 * land and goes back in the queue. A claim that never reached signing is freed
 * once it is old enough that its run must have died.
 */
async function reconcile(db: Db, deadline: number): Promise<number> {
  const stale = new Date(Date.now() - STALE_MS).toISOString();
  await db.from("rewards").update({ payout_tx: null, payout_at: null }).like("payout_tx", "sending-%").lt("payout_at", stale);

  const { data } = await db
    .from("rewards")
    .select("payout_tx,payout_nonce,payout_at,address,token,amount")
    .like("payout_tx", "0x%")
    .is("paid_at", null)
    .limit(20000);
  const sends = new Map<string, { nonce: number; at: string; address: string; token: string; amount: bigint }>();
  for (const r of (data ?? []) as any[]) {
    const s = sends.get(r.payout_tx) ?? { nonce: Number(r.payout_nonce), at: r.payout_at, address: r.address, token: r.token, amount: ZERO };
    s.amount += BigInt(r.amount);
    sends.set(r.payout_tx, s);
  }
  if (!sends.size) return 0;

  const mined = await treasuryNonce("latest");
  const list = Array.from(sends);
  let confirmed = 0;
  for (let i = 0; i < list.length && Date.now() < deadline; i += 8) {
    await Promise.all(
      list.slice(i, i + 8).map(async ([hash, s]) => {
        let status: Awaited<ReturnType<typeof receiptOf>>;
        try {
          status = await receiptOf(hash as `0x${string}`);
        } catch {
          return; // can't tell right now, look again next run
        }
        if (status === "success") {
          await db.from("rewards").update({ paid_at: new Date().toISOString() }).eq("payout_tx", hash);
          confirmed++;
          void notify([s.address], {
            title: "Rewards paid 💸",
            body: `${usd(s.amount, s.token).toFixed(2)} ${symbolForToken(s.token)} in cashback and invite rewards just landed in your wallet.`,
            url: "/profile",
          });
        } else if (status === "reverted" || (s.nonce < mined && Date.parse(s.at) < Date.now() - STALE_MS)) {
          await db.from("rewards").update({ payout_tx: null, payout_nonce: null, payout_at: null }).eq("payout_tx", hash);
        }
      })
    );
  }
  return confirmed;
}

/**
 * Pay everyone who is owed at least PAYOUT_MIN, in the coin their matches used,
 * from the treasury. Each transfer is signed and its hash written down before
 * it is broadcast, so a crash or a network error at any point leaves a record
 * that reconcile() checks against the chain: nothing is ever sent twice.
 */
export async function payRewards(budgetMs = 40_000) {
  const started = Date.now();
  if (!treasuryConfigured()) return { sent: 0, paid: 0, waiting: 0, short: [] as string[], error: "Rewards wallet not set up" };
  const db = supabaseAdmin();
  let paid = await reconcile(db, started + budgetMs / 4);

  const { data } = await db.from("rewards").select("id,address,token,amount").is("payout_tx", null).order("id").limit(20000);
  const groups = new Map<string, { address: string; token: string; total: bigint; ids: number[] }>();
  for (const r of (data ?? []) as any[]) {
    const k = `${r.address}:${r.token}`;
    const g = groups.get(k) ?? { address: r.address, token: r.token, total: ZERO, ids: [] as number[] };
    g.total += BigInt(r.amount);
    g.ids.push(r.id);
    groups.set(k, g);
  }
  const due = Array.from(groups.values()).filter((g) => usd(g.total, g.token) >= PAYOUT_MIN);
  if (!due.length) return { sent: 0, paid, waiting: groups.size, short: [] as string[], error: null as string | null };

  const tokens = Array.from(new Set(due.map((g) => g.token))) as `0x${string}`[];
  const [{ tokens: held }, fees, first] = await Promise.all([treasuryBalances(tokens), treasuryFees(), treasuryNonce("pending")]);
  const short = new Set<string>();
  let nonce = first;
  let sent = 0;
  let last: `0x${string}` | null = null;

  for (const g of due) {
    if (Date.now() - started > budgetMs) break;
    if ((held[g.token] ?? ZERO) < g.total) {
      short.add(symbolForToken(g.token));
      continue;
    }
    const run = `sending-${randomUUID()}`;
    const [{ data: claimed }, gas] = await Promise.all([
      db
        .from("rewards")
        .update({ payout_tx: run, payout_at: new Date().toISOString() })
        .in("id", g.ids)
        .is("payout_tx", null)
        .select("amount"),
      transferGas(g.token as `0x${string}`, g.address, g.total).catch(() => null),
    ]);
    const amount = ((claimed ?? []) as any[]).reduce((a: bigint, r) => a + BigInt(r.amount), ZERO);
    if (amount <= ZERO) continue;
    if (!gas) {
      // it would revert (a frozen address, a paused coin): keep it waiting, spend nothing
      await db.from("rewards").update({ payout_tx: null, payout_at: null }).eq("payout_tx", run);
      continue;
    }

    const { raw, hash } = await signTransfer(g.token as `0x${string}`, g.address, amount, nonce, gas, fees);
    const { error } = await db.from("rewards").update({ payout_tx: hash, payout_nonce: nonce }).eq("payout_tx", run);
    if (error) break; // nothing went out; the claim goes stale and is freed
    try {
      await sendRaw(raw);
    } catch {
      break; // it may have gone out anyway, the next run asks the chain
    }
    nonce++;
    held[g.token] = (held[g.token] ?? ZERO) - amount;
    sent++;
    last = hash;
  }

  if (last) {
    await landed(last, 8_000).catch(() => {});
    paid += await reconcile(db, Date.now() + 8_000);
  }
  return { sent, paid, waiting: groups.size - sent, short: Array.from(short), error: null as string | null };
}

/**
 * Send the treasury's surplus to the profit wallet, keeping everything owed
 * plus a small buffer per coin. Only meaningful once the escrow's fees are
 * routed to the treasury.
 */
export async function sweepProfit() {
  if (!treasuryConfigured()) throw new Error("Rewards wallet not set up");
  const to = (process.env.PROFIT_WALLET?.trim() || OWNER_ADDRESS).toLowerCase();
  const owed = await rewardsOwed();
  const list = tokensFor(celo.id).map((t) => t.address.toLowerCase() as `0x${string}`);
  const { tokens: held } = await treasuryBalances(list);
  const sent: { symbol: string; amount: number; tx: string }[] = [];
  for (const t of list) {
    const buffer = parseUnits("1", decimalsForToken(t)); // one whole coin stays behind as a cushion
    const free = (held[t] ?? ZERO) - (owed[t] ?? ZERO) - buffer;
    if (free <= ZERO) continue;
    const tx = await sendToken(t, to, free);
    if (await landed(tx)) sent.push({ symbol: symbolForToken(t), amount: usd(free, t), tx });
  }
  return { to, sent };
}
