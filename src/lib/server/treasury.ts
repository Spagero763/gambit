import { createWalletClient, createPublicClient, http, parseUnits, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { ERC20_ABI } from "@/lib/escrow";

// Treasury that funds prize payouts. Separate key from the relayer so prize
// funds are isolated from settlement gas. Celo mainnet only.
const RPC = "https://forno.celo.org";
// USDm/cUSD on Celo mainnet (18 decimals).
const USDM = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;
const DECIMALS = 18;

export function treasuryConfigured() {
  return !!process.env.TREASURY_PRIVATE_KEY;
}

/** Public treasury address (no key). null when not configured. */
export function treasuryAddress(): string | null {
  if (!process.env.TREASURY_PRIVATE_KEY) return null;
  try {
    return privateKeyToAccount(treasuryKey()).address;
  } catch {
    return null;
  }
}

function treasuryKey(): `0x${string}` {
  let k = process.env.TREASURY_PRIVATE_KEY?.trim();
  if (!k) throw new Error("Treasury not configured");
  k = k.replace(/^["']|["']$/g, "").trim();
  if (!k.startsWith("0x")) k = "0x" + k;
  return k as `0x${string}`;
}

/** Treasury's current USDm balance (wei). */
export async function treasuryUsdmBalance(): Promise<bigint> {
  const account = privateKeyToAccount(treasuryKey());
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  return (await pub.readContract({
    address: USDM,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  })) as bigint;
}

/** Send `amountHuman` USDm from the treasury to `to`. */
export async function payUsdm(to: string, amountHuman: number): Promise<`0x${string}`> {
  return payToken(USDM, to, parseUnits(amountHuman.toString(), DECIMALS));
}

/** ERC-20 transfer from the treasury. We set gas + gasPrice EXPLICITLY: viem's
 *  default fee logic doubles the gas price for the balance check, which fails
 *  when the treasury's CELO is low and Celo's gas price spikes. Using the plain
 *  network gas price keeps the pre-flight cost realistic. */
async function payToken(token: `0x${string}`, to: string, amountWei: bigint): Promise<`0x${string}`> {
  const account = privateKeyToAccount(treasuryKey());
  const wallet = createWalletClient({ account, chain: celo, transport: http(RPC) });
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  const gasPrice = await pub.getGasPrice();
  const hash = await wallet.writeContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [getAddress(to), amountWei],
    type: "legacy",
    gas: BigInt(250000),
    gasPrice,
  });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("token transfer reverted");
  return hash;
}
