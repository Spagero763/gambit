import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, parseAbi, formatUnits } from "viem";
import { supabaseAdmin } from "@/lib/supabase";
import { isOwner } from "@/lib/server/admin";
import { relayerConfigured, relayerDiagnostics } from "@/lib/server/settle";
import { celoReadTransport } from "@/lib/server/rpc";
import { weekIndex, weekKey } from "@/lib/cup";
import { decimalsForToken, symbolForToken, tokensFor } from "@/lib/tokens";
import { ESCROW_ADDRESS } from "@/lib/escrow";
import { rewardsOwed } from "@/lib/server/rewards";
import { treasuryAddress, treasuryBalances, treasuryConfigured } from "@/lib/server/treasury";
import { celo } from "viem/chains";

export const runtime = "nodejs";

const MIN_GAS_CELO = 0.05;
const USDM = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;
const erc20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);

const envAddr = (name: string): `0x${string}` | null => {
  const a = process.env[name]?.trim();
  return a && a.startsWith("0x") && a.length === 42 ? (a as `0x${string}`) : null;
};

/** Balances of the prize vaults + low-fund flags, for the ops card. */
async function vaultStatus() {
  const pub = createPublicClient({ chain: celo, transport: celoReadTransport() });

  /** Read a vault's balance in ITS OWN payout token, at that token's decimals.
   *  The referral vault pays USDT (6 decimals) now, so assuming USDm's 18 here
   *  would render a funded vault as 0.0000000000006 and trip the low-funds
   *  warning forever. */
  const readVault = async (holder: `0x${string}` | null, fallbackToken: `0x${string}`) => {
    if (!holder) return null;
    let token = fallbackToken;
    try {
      token = (await pub.readContract({
        address: holder,
        abi: parseAbi(["function token() view returns (address)"]),
        functionName: "token",
      })) as `0x${string}`;
    } catch {
      /* older vault without a public token(), fall back */
    }
    const raw = (await pub.readContract({ address: token, abi: erc20, functionName: "balanceOf", args: [holder] })) as bigint;
    return { token, balance: Number(formatUnits(raw, decimalsForToken(token))), symbol: symbolForToken(token) };
  };

  const cupAddr = envAddr("CUP_CONTRACT");
  const refAddr = envAddr("REWARDS_CONTRACT");
  const [cup, referral] = await Promise.all([readVault(cupAddr, USDM), readVault(refAddr, USDM)]);

  const cupPrize = Number(process.env.CUP_PRIZE_USDM ?? "10");
  // `token` is the ERC20 each vault pays out in, the admin UI needs it to
  // sweep (withdraw) or fund the vault from the owner's own wallet.
  return {
    cup: cup === null ? null : { address: cupAddr, token: cup.token, symbol: cup.symbol, balance: cup.balance, low: cup.balance < cupPrize },
    referral:
      referral === null
        ? null
        : {
            address: refAddr,
            token: referral.token,
            symbol: referral.symbol,
            balance: referral.balance,
            // the one-time invite bonus was replaced by the rewards ledger; this vault only holds leftovers
            low: false,
          },
  };
}

/** Rewards owed per coin against what the rewards wallet holds, and where the escrow sends its fees. */
async function rewardsStatus() {
  const list = tokensFor(celo.id).map((t) => t.address.toLowerCase() as `0x${string}`);
  const wallet = treasuryConfigured() ? treasuryAddress() : null;
  const pub = createPublicClient({ chain: celo, transport: celoReadTransport() });
  const [owed, held, feeRecipient] = await Promise.all([
    rewardsOwed(),
    wallet ? treasuryBalances(list) : Promise.resolve(null),
    pub.readContract({ address: ESCROW_ADDRESS[celo.id], abi: parseAbi(["function feeRecipient() view returns (address)"]), functionName: "feeRecipient" }) as Promise<string>,
  ]);
  return {
    wallet,
    feeRecipient,
    feesToWallet: !!wallet && feeRecipient.toLowerCase() === wallet.toLowerCase(),
    celo: held ? Number(formatUnits(held.celo, 18)) : null,
    coins: list.map((t) => ({
      symbol: symbolForToken(t),
      owed: Number(formatUnits(owed[t] ?? BigInt(0), decimalsForToken(t))),
      held: held ? Number(formatUnits(held.tokens[t] ?? BigInt(0), decimalsForToken(t))) : null,
    })),
  };
}

/** Owner-only operations dashboard: relayer gas + anything needing attention. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!isOwner(token)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const db = supabaseAdmin();

    let relayer: { address: string; balanceCELO: number; lowGas: boolean } | null = null;
    if (relayerConfigured()) {
      const d = await relayerDiagnostics();
      const bal = Number(BigInt(d.balances[String(celo.id)] ?? "0")) / 1e18;
      relayer = { address: d.address, balanceCELO: Number(bal.toFixed(4)), lowGas: bal < MIN_GAS_CELO };
    }

    // Matches awaiting payout or with a recorded settle error.
    const { data: matches } = await db
      .from("matches")
      .select("id,game,chain_id,status,winner,settle_error,updated_at")
      .or("status.eq.settling,settle_error.not.is.null")
      .order("updated_at", { ascending: false })
      .limit(50);

    // Tournaments still in flight or with a settle error.
    const { data: tournaments } = await db
      .from("tournaments")
      .select("id,chain_id,status,winners,settle_error,capacity,updated_at")
      .or("status.in.(active,settling),settle_error.not.is.null")
      .order("updated_at", { ascending: false })
      .limit(50);

    let vaults = null;
    try {
      vaults = await vaultStatus();
    } catch {
      /* vault reads are best-effort, the panel still works without them */
    }

    let rewards = null;
    try {
      rewards = await rewardsStatus();
    } catch {
      /* the rewards table may not exist until the schema is applied */
    }

    // this week's cup entries with names + ban flags, for moderation
    const wk = weekKey(weekIndex());
    const { data: entries } = await db
      .from("cup_entries")
      .select("address,score")
      .eq("week", wk)
      .order("score", { ascending: false })
      .limit(50);
    let cup: any[] = entries ?? [];
    if (cup.length) {
      const { data: profs } = await db
        .from("profiles")
        .select("address,name,banned")
        .in("address", cup.map((e) => e.address));
      const byAddr = Object.fromEntries((profs ?? []).map((p) => [p.address, p]));
      cup = cup.map((e) => ({ ...e, name: byAddr[e.address]?.name || null, banned: !!byAddr[e.address]?.banned }));
    }

    return NextResponse.json({ relayer, vaults, rewards, cup, week: wk, matches: matches ?? [], tournaments: tournaments ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
