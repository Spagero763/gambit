import {
  createWalletClient,
  createPublicClient,
  http,
  getAddress,
  parseAbi,
  parseUnits,
  formatUnits,
  keccak256,
  encodePacked,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { supabaseAdmin } from "@/lib/supabase";
import { notify } from "@/lib/server/push";
import { symbolForToken, decimalsForToken } from "@/lib/tokens";

// Referral bonus: the INVITER is paid from the on-chain RewardsVault when an
// invited friend settles their FIRST staked match. That is the whole condition.
// Playing a staked match is its own anti-farming gate — the friend must put real
// money at risk, which costs more than the bonus pays.
//
// The payment key is derived from the FRIEND's wallet, and the vault pays each
// key exactly once — one bonus per friend, ever, enforced on-chain. No
// bookkeeping table needed.
//
// The payout token and its decimals are read from the vault, so changing the
// currency is a redeploy plus a REWARDS_CONTRACT change, with no code edit.
//
// Env:
//   REFERRAL_BONUS    amount the inviter earns per friend (default 0 = off)
//                     REFERRAL_USDM is still read as a fallback, since that is
//                     what production was set with before the rename.
//   REWARDS_CONTRACT  the RewardsVault address (unset = off)
const RPC = "https://forno.celo.org";

const vaultAbi = parseAbi([
  "function payReward(bytes32 key, string tag, address[] recipients, uint256[] amounts)",
  "function paid(bytes32 key) view returns (bool)",
]);

/**
 * The per-friend bonus, from env. Exported because three call sites need it and
 * reading the env directly is how they drift: the API card once read only the
 * old name and displayed 0 while payouts were configured correctly.
 *
 * REFERRAL_USDM is the pre-rename name, still honoured.
 */
export function referralAmount(): number {
  const n = Number(process.env.REFERRAL_BONUS ?? process.env.REFERRAL_USDM ?? "0");
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const amount = referralAmount;

function vault(): `0x${string}` | null {
  const a = process.env.REWARDS_CONTRACT?.trim();
  return a && a.startsWith("0x") && a.length === 42 ? (a as `0x${string}`) : null;
}

function relayerKey(): `0x${string}` {
  let k = process.env.RELAYER_PRIVATE_KEY?.trim();
  if (!k) throw new Error("Relayer not configured");
  k = k.replace(/^["']|["']$/g, "").trim();
  if (!k.startsWith("0x")) k = "0x" + k;
  return k as `0x${string}`;
}

export const refKey = (invitee: string) =>
  keccak256(encodePacked(["string", "address"], ["referral", getAddress(invitee)]));

/**
 * The token the referral vault actually pays in, read from the vault itself.
 *
 * The vault's token is immutable, so swapping the payout currency means
 * deploying a new vault and repointing REWARDS_CONTRACT. Reading it here means
 * both the copy AND the decimals follow automatically, which matters more than
 * it looks: USDT is 6 decimals and USDm is 18, so a hard-coded 18 would compute
 * a payout 10^12 times too large against a USDT vault.
 *
 * Cached per process — the value cannot change for a given vault address.
 */
const tokenCache = new Map<string, { address: `0x${string}`; symbol: string; decimals: number }>();

async function vaultToken(): Promise<{ address: `0x${string}`; symbol: string; decimals: number } | null> {
  const addr = vault();
  if (!addr) return null;
  const hit = tokenCache.get(addr);
  if (hit) return hit;
  try {
    const pub = createPublicClient({ chain: celo, transport: http(RPC) });
    const token = (await pub.readContract({
      address: addr,
      abi: parseAbi(["function token() view returns (address)"]),
      functionName: "token",
    })) as `0x${string}`;
    const info = { address: token, symbol: symbolForToken(token), decimals: decimalsForToken(token) };
    tokenCache.set(addr, info);
    return info;
  } catch {
    return null;
  }
}

/** The symbol the referral vault pays in, for UI copy. Falls back to USDm. */
export async function referralSymbol(): Promise<string> {
  return (await vaultToken())?.symbol ?? "USDm";
}

/** Has this friend's referral already been paid out? Public read. */
export async function referralPaid(invitee: string): Promise<boolean> {
  const addr = vault();
  if (!addr) return false;
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  return (await pub.readContract({ address: addr, abi: vaultAbi, functionName: "paid", args: [refKey(invitee)] })) as boolean;
}

/** Core: pay the inviter for one activated friend, exactly once. */
async function payInviterFor(invitee: string, opponent: string | undefined): Promise<boolean> {
  const amt = amount();
  const addr = vault();
  if (!amt || !addr || !process.env.RELAYER_PRIVATE_KEY) return false;

  const db = supabaseAdmin();
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });

  const { data: prof } = await db.from("profiles").select("referred_by,banned").eq("address", invitee).maybeSingle();
  if ((prof as any)?.banned) return false;
  const inviter = (prof?.referred_by as string | null)?.toLowerCase();
  // playing the person who invited you is the cheapest way to farm a bonus
  if (!inviter || inviter === invitee || inviter === opponent) return false;

  const { data: inv } = await db.from("profiles").select("banned").eq("address", inviter).maybeSingle();
  if ((inv as any)?.banned) return false;

  const key = refKey(invitee);
  if (await pub.readContract({ address: addr, abi: vaultAbi, functionName: "paid", args: [key] })) return false;

  // Decimals come from the vault's own token, never a constant. USDT is 6 and
  // USDm is 18, so assuming 18 against a USDT vault would try to pay a million
  // times the intended bonus and drain it on the first referral.
  const tok = await vaultToken();
  if (!tok) return false;

  const account = privateKeyToAccount(relayerKey());
  const wallet = createWalletClient({ account, chain: celo, transport: http(RPC) });
  const gasPrice = await pub.getGasPrice();
  const wei = parseUnits(amt.toString(), tok.decimals);

  // The write below skips estimation with a fixed gas limit, so an empty vault
  // or a lost race would still send and burn the relayer's gas. Check first.
  const held = (await pub.readContract({
    address: tok.address,
    abi: parseAbi(["function balanceOf(address) view returns (uint256)"]),
    functionName: "balanceOf",
    args: [addr],
  })) as bigint;
  if (held < wei) return false;
  await pub.simulateContract({
    account,
    address: addr,
    abi: vaultAbi,
    functionName: "payReward",
    args: [key, "referral", [getAddress(inviter)], [wei]],
  });

  const hash = await wallet.writeContract({
    address: addr,
    abi: vaultAbi,
    functionName: "payReward",
    args: [key, "referral", [getAddress(inviter)], [wei]],
    type: "legacy",
    gas: BigInt(300000),
    gasPrice,
  });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") return false;

  void notify([inviter], {
    title: "Referral bonus paid 💸",
    body: `Your friend just played a staked match. ${amt} ${tok.symbol} hit your wallet.`,
    url: "/profile",
  });
  return true;
}

export interface SettledMatch {
  creator: string | null;
  opponent: string | null;
  winner: string | null;
  stake: string | null;
  decimals?: number | null;
}

/**
 * Fire-and-forget after a staked match settles: pay the referral bonus for any
 * player who was invited and hasn't been credited yet. Never throws — a
 * referral hiccup must not affect match settlement.
 *
 * Only a decided match counts, since a draw refunds both sides and proves
 * nothing. And the stake has to be big enough that the match fee (5% of both
 * entries) covers two bonuses, so that playing your own second wallet always
 * costs more than it pays.
 */
export async function creditReferrals(m: SettledMatch): Promise<void> {
  try {
    const bonus = amount();
    if (!bonus || !m.winner) return;
    const stake = Number(formatUnits(BigInt(m.stake || "0"), m.decimals ?? 18));
    if (stake < bonus * 20) return;
    const seats = [m.creator, m.opponent].map((s) => s?.toLowerCase()).filter(Boolean) as string[];
    for (const p of seats) {
      try {
        await payInviterFor(p, seats.find((s) => s !== p));
      } catch {
        /* next player — the vault key makes retries safe on a future settle */
      }
    }
  } catch {
    /* referral must never break settlement */
  }
}

// There used to be a second activation path: a friend who had merely played free
// games counted once they proved they were a real human. That proof came from the
// identity provider that has since been removed, so the path went with it. A
// staked match is now the only trigger, and it is the stronger gate anyway.
