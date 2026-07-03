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

// Daily G$ claims through a RewardsVault instance (token = G$), so every claim
// is an on-chain contract interaction anyone can read: one RewardPaid event
// tagged "daily" per person per day, once-only enforced by the vault's key
// rule (key = hash of "daily" + wallet + day number). When CLAIM_CONTRACT is
// unset the API falls back to plain treasury transfers, so claims never break
// while the vault is being set up.
const RPC = "https://forno.celo.org";
const G_DECIMALS = 18;

const vaultAbi = parseAbi([
  "function payReward(bytes32 key, string tag, address[] recipients, uint256[] amounts)",
  "function paid(bytes32 key) view returns (bool)",
  "function token() view returns (address)",
]);

const erc20Abi = parseAbi(["function balanceOf(address) view returns (uint256)"]);

export function claimContract(): `0x${string}` | null {
  const a = process.env.CLAIM_CONTRACT?.trim();
  return a && a.startsWith("0x") && a.length === 42 ? (a as `0x${string}`) : null;
}

function relayerKey(): `0x${string}` {
  let k = process.env.RELAYER_PRIVATE_KEY?.trim();
  if (!k) throw new Error("Relayer not configured");
  k = k.replace(/^["']|["']$/g, "").trim();
  if (!k.startsWith("0x")) k = "0x" + k;
  return k as `0x${string}`;
}

/** UTC day number — one claim key per person per day. */
export const claimDay = (now = Date.now()) => Math.floor(now / 86_400_000);

const claimKey = (user: string, day: number) =>
  keccak256(encodePacked(["string", "address", "uint256"], ["daily", getAddress(user), BigInt(day)]));

/** Has this wallet already claimed today, according to the chain itself? */
export async function claimedOnChain(user: string, day = claimDay()): Promise<boolean> {
  const addr = claimContract();
  if (!addr) return false;
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  return (await pub.readContract({ address: addr, abi: vaultAbi, functionName: "paid", args: [claimKey(user, day)] })) as boolean;
}

/** The claim vault's G$ balance (wei). */
export async function claimVaultBalance(): Promise<bigint> {
  const addr = claimContract();
  if (!addr) return BigInt(0);
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  const token = (await pub.readContract({ address: addr, abi: vaultAbi, functionName: "token" })) as `0x${string}`;
  return (await pub.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [addr] })) as bigint;
}

/** Pay today's G$ claim through the vault. One keyed, tagged, public event. */
export async function payClaimOnChain(user: string, amountHuman: number, day = claimDay()): Promise<`0x${string}`> {
  const addr = claimContract();
  if (!addr) throw new Error("CLAIM_CONTRACT not set");
  const account = privateKeyToAccount(relayerKey());
  const wallet = createWalletClient({ account, chain: celo, transport: http(RPC) });
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  const gasPrice = await pub.getGasPrice();
  const hash = await wallet.writeContract({
    address: addr,
    abi: vaultAbi,
    functionName: "payReward",
    args: [claimKey(user, day), "daily", [getAddress(user)], [parseUnits(amountHuman.toString(), G_DECIMALS)]],
    type: "legacy",
    gas: BigInt(300000),
    gasPrice,
  });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("claim payout reverted");
  return hash;
}
