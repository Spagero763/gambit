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
import { symbolForToken } from "@/lib/tokens";

// Referral bonus: the INVITER earns REFERRAL_USDM from the on-chain
// RewardsVault when an invited friend activates, which means the friend
// settling their FIRST staked match. The economics defend themselves there —
// faking it costs more than the bonus pays.
//
// The payment key is derived from the FRIEND's wallet, and the vault pays each
// key exactly once — one bonus per friend, ever, enforced on-chain. No
// bookkeeping table needed.
//
// Env:
//   REFERRAL_USDM     amount the inviter earns per friend (default 0 = off)
//   REWARDS_CONTRACT  the RewardsVault address (unset = off)
const RPC = "https://forno.celo.org";

const vaultAbi = parseAbi([
  "function payReward(bytes32 key, string tag, address[] recipients, uint256[] amounts)",
  "function paid(bytes32 key) view returns (bool)",
]);

function amount(): number {
  const n = Number(process.env.REFERRAL_USDM ?? "0");
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
 * The symbol of the token the referral vault actually pays in.
 *
 * The vault's token is immutable, so this is fixed per deployed vault — but
 * reading it means the UI names whatever is really being paid instead of a
 * hard-coded guess. Swap the vault for a USDT one and the copy follows on its
 * own. Falls back to USDm, which is what the current vault holds.
 */
export async function referralSymbol(): Promise<string> {
  const addr = vault();
  if (!addr) return "USDm";
  try {
    const pub = createPublicClient({ chain: celo, transport: http(RPC) });
    const token = (await pub.readContract({
      address: addr,
      abi: parseAbi(["function token() view returns (address)"]),
      functionName: "token",
    })) as `0x${string}`;
    return symbolForToken(token);
  } catch {
    return "USDm";
  }
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

  const account = privateKeyToAccount(relayerKey());
  const wallet = createWalletClient({ account, chain: celo, transport: http(RPC) });
  const gasPrice = await pub.getGasPrice();
  const wei = parseUnits(amt.toString(), 18); // USDm is 18 decimals
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
    body: `Your friend is playing on Gambit. ${amt} USDm just hit your wallet.`,
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

// There used to be a second, free-play activation path: a friend who had merely
// played counted once they proved they were a real human. That proof was the only
// thing standing between the vault and account farming, so it went out with the
// identity provider rather than staying behind with no gate at all.
