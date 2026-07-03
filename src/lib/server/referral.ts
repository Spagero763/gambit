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

// Referral bonus: when a player who was invited (profiles.referred_by) settles
// their FIRST staked match, inviter and invitee each get REFERRAL_USDM from
// the on-chain RewardsVault. The vault pays each key exactly once, so this is
// safe to call from every settle path — the chain itself remembers who has
// been paid, no extra bookkeeping table needed.
//
// Env:
//   REFERRAL_USDM     amount per person (default 0 = programme off)
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

const refKey = (invitee: string) =>
  keccak256(encodePacked(["string", "address"], ["referral", getAddress(invitee)]));

/**
 * Fire-and-forget after a staked match settles: pay the referral bonus for any
 * player who was invited and hasn't been credited yet. Never throws — a
 * referral hiccup must not affect match settlement.
 */
export async function creditReferrals(players: (string | null | undefined)[]): Promise<void> {
  try {
    const amt = amount();
    const addr = vault();
    if (!amt || !addr || !process.env.RELAYER_PRIVATE_KEY) return;

    const db = supabaseAdmin();
    const pub = createPublicClient({ chain: celo, transport: http(RPC) });

    for (const raw of players) {
      const p = raw?.toLowerCase();
      if (!p) continue;
      try {
        const { data: prof } = await db.from("profiles").select("referred_by").eq("address", p).maybeSingle();
        const inviter = (prof?.referred_by as string | null)?.toLowerCase();
        if (!inviter || inviter === p) continue;

        const key = refKey(p);
        if (await pub.readContract({ address: addr, abi: vaultAbi, functionName: "paid", args: [key] })) continue;

        const account = privateKeyToAccount(relayerKey());
        const wallet = createWalletClient({ account, chain: celo, transport: http(RPC) });
        const gasPrice = await pub.getGasPrice();
        const wei = parseUnits(amt.toString(), 18); // USDm is 18 decimals
        const hash = await wallet.writeContract({
          address: addr,
          abi: vaultAbi,
          functionName: "payReward",
          args: [key, "referral", [getAddress(inviter), getAddress(p)], [wei, wei]],
          type: "legacy",
          gas: BigInt(300000),
          gasPrice,
        });
        const receipt = await pub.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") continue;

        void notify([inviter], {
          title: "Referral bonus paid 💸",
          body: `Your friend played their first staked match. ${amt} USDm just hit your wallet.`,
          url: "/profile",
        });
        void notify([p], {
          title: "Welcome bonus paid 💸",
          body: `First staked match done. ${amt} USDm just hit your wallet.`,
          url: "/profile",
        });
      } catch {
        /* next player — the vault key makes retries safe on a future settle */
      }
    }
  } catch {
    /* referral must never break settlement */
  }
}
