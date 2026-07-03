import { createWalletClient, createPublicClient, http, getAddress, parseAbi, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

// The WeeklyCup prize vault on Celo mainnet. When CUP_CONTRACT is set, weekly
// podium payouts go through the contract — one relayer transaction pays every
// winner, the contract enforces once-per-week, and WeekSettled events are the
// public record. Unset, the API falls back to direct treasury transfers.
const RPC = "https://forno.celo.org";
const USDM_DECIMALS = 18;

const cupAbi = parseAbi([
  "function settleWeek(uint256 week, address[] winners, uint256[] amounts)",
  "function settled(uint256 week) view returns (bool)",
  "function token() view returns (address)",
]);

const erc20Abi = parseAbi(["function balanceOf(address) view returns (uint256)"]);

export function cupContract(): `0x${string}` | null {
  const a = process.env.CUP_CONTRACT?.trim();
  return a && a.startsWith("0x") && a.length === 42 ? (a as `0x${string}`) : null;
}

function relayerKey(): `0x${string}` {
  let k = process.env.RELAYER_PRIVATE_KEY?.trim();
  if (!k) throw new Error("Relayer not configured");
  k = k.replace(/^["']|["']$/g, "").trim();
  if (!k.startsWith("0x")) k = "0x" + k;
  return k as `0x${string}`;
}

/** Has this week already been paid on-chain? Public read. */
export async function cupWeekSettledOnChain(week: number): Promise<boolean> {
  const addr = cupContract();
  if (!addr) return false;
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  return (await pub.readContract({ address: addr, abi: cupAbi, functionName: "settled", args: [BigInt(week)] })) as boolean;
}

/** The vault's USDm balance (wei) — the prize must sit in the CONTRACT. */
export async function cupVaultBalance(): Promise<bigint> {
  const addr = cupContract();
  if (!addr) return BigInt(0);
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  const token = (await pub.readContract({ address: addr, abi: cupAbi, functionName: "token" })) as `0x${string}`;
  return (await pub.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [addr] })) as bigint;
}

/** Pay the whole podium in ONE on-chain transaction via the WeeklyCup contract.
 *  Same explicit gas handling as the treasury (Celo gas quirks). */
export async function settleCupOnChain(
  week: number,
  winners: { address: string; amount: number }[]
): Promise<`0x${string}`> {
  const addr = cupContract();
  if (!addr) throw new Error("CUP_CONTRACT not set");
  const account = privateKeyToAccount(relayerKey());
  const wallet = createWalletClient({ account, chain: celo, transport: http(RPC) });
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  const gasPrice = await pub.getGasPrice();
  const hash = await wallet.writeContract({
    address: addr,
    abi: cupAbi,
    functionName: "settleWeek",
    args: [
      BigInt(week),
      winners.map((w) => getAddress(w.address)),
      winners.map((w) => parseUnits(w.amount.toString(), USDM_DECIMALS)),
    ],
    type: "legacy",
    gas: BigInt(400000),
    gasPrice,
  });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("cup settle reverted");
  return hash;
}
