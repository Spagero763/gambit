import {
  createWalletClient,
  createPublicClient,
  http,
  getAddress,
  parseAbi,
  parseUnits,
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

function amount(): number {
  // REFERRAL_USDM is the old name, kept so the live Vercel value keeps working
  // through the rename. Either one sets the bonus.
  const n = Number(process.env.REFERRAL_BONUS ?? process.env.REFERRAL_USDM ?? "0");
  return Number.isFinite(n) && n > 0 ? n : 0;
}

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
async function payInviterFor(invitee: string): Promise<boolean> {
  const amt = amount();
  const addr = vault();
  if (!amt || !addr || !process.env.RELAYER_PRIVATE_KEY) return false;

  const db = supabaseAdmin();
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });

  const { data: prof } = await db.from("profiles").select("referred_by,banned").eq("address", invitee).maybeSingle();
  if ((prof as any)?.banned) return false;
  const inviter = (prof?.referred_by as string | null)?.toLowerCase();
  if (!inviter || inviter === invitee) return false;

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

/**
 * Fire-and-forget after a staked match settles: pay the referral bonus for any
 * player who was invited and hasn't been credited yet. Never throws — a
 * referral hiccup must not affect match settlement.
 */
export async function creditReferrals(players: (string | null | undefined)[]): Promise<void> {
  try {
    for (const raw of players) {
      const p = raw?.toLowerCase();
      if (!p) continue;
      try {
        await payInviterFor(p);
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
