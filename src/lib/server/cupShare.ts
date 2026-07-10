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

// Weekly Cup "share your win" bonus. A winner who posts their result on X can
// claim a small extra reward, paid from the on-chain RewardsVault (USDm) using
// the same pay-once key rule as referrals — one bonus per winner per week,
// enforced by the contract, no bookkeeping needed.
//
// The prize itself is ALWAYS paid automatically at settle (see cup settle). This
// is a bonus on top, never a gate, so nobody's winnings are ever held.
//
// Env:
//   CUP_SHARE_USDM    bonus amount per winner (default 0 = feature off)
//   REWARDS_CONTRACT  the RewardsVault address (shared with referrals; USDm)
const RPC = "https://forno.celo.org";

const vaultAbi = parseAbi([
  "function payReward(bytes32 key, string tag, address[] recipients, uint256[] amounts)",
  "function paid(bytes32 key) view returns (bool)",
]);

export function cupShareAmount(): number {
  const n = Number(process.env.CUP_SHARE_USDM ?? "0");
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

/** One key per winner per week — the vault pays it at most once. */
export const cupShareKey = (week: string, winner: string) =>
  keccak256(encodePacked(["string", "string", "address"], ["cupshare", week, getAddress(winner)]));

/** Has this winner already claimed their share bonus for this week? Public read. */
export async function cupSharePaid(week: string, winner: string): Promise<boolean> {
  const addr = vault();
  if (!addr) return false;
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  return (await pub.readContract({
    address: addr,
    abi: vaultAbi,
    functionName: "paid",
    args: [cupShareKey(week, winner)],
  })) as boolean;
}

/** Pay the share bonus to a winner. Waits for the receipt so the caller only
 *  records success once the USDm has actually landed. */
export async function payCupShare(week: string, winner: string): Promise<`0x${string}`> {
  const addr = vault();
  if (!addr) throw new Error("REWARDS_CONTRACT not set");
  const amt = cupShareAmount();
  if (!amt) throw new Error("cup share bonus disabled");
  const account = privateKeyToAccount(relayerKey());
  const wallet = createWalletClient({ account, chain: celo, transport: http(RPC) });
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  const gasPrice = await pub.getGasPrice();
  const hash = await wallet.writeContract({
    address: addr,
    abi: vaultAbi,
    functionName: "payReward",
    args: [cupShareKey(week, winner), "cupshare", [getAddress(winner)], [parseUnits(String(amt), 18)]],
    type: "legacy",
    gas: BigInt(300000),
    gasPrice,
  });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("cup share payout reverted");
  return hash;
}
