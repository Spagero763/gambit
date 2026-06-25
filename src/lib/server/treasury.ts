import { createWalletClient, createPublicClient, http, parseUnits, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { ERC20_ABI } from "@/lib/escrow";

// Treasury that funds the daily G$ reward. Separate key from the relayer so
// prize/reward funds are isolated from settlement gas. Celo mainnet only.
const RPC = "https://forno.celo.org";
const GOODDOLLAR = "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A" as const;
const DECIMALS = 18;

export function treasuryConfigured() {
  return !!process.env.TREASURY_PRIVATE_KEY;
}

function treasuryKey(): `0x${string}` {
  let k = process.env.TREASURY_PRIVATE_KEY?.trim();
  if (!k) throw new Error("Treasury not configured");
  k = k.replace(/^["']|["']$/g, "").trim();
  if (!k.startsWith("0x")) k = "0x" + k;
  return k as `0x${string}`;
}

/** Treasury's current G$ balance (wei). Lets the endpoint fail gracefully when empty. */
export async function treasuryGBalance(): Promise<bigint> {
  const account = privateKeyToAccount(treasuryKey());
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  return (await pub.readContract({
    address: GOODDOLLAR,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  })) as bigint;
}

export function gWei(amountHuman: number): bigint {
  return parseUnits(amountHuman.toString(), DECIMALS);
}

/** Send `amountHuman` G$ from the treasury to `to`. Server-only; key never leaves env. */
export async function payDailyG(to: string, amountHuman: number): Promise<`0x${string}`> {
  const account = privateKeyToAccount(treasuryKey());
  const wallet = createWalletClient({ account, chain: celo, transport: http(RPC) });
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  const hash = await wallet.writeContract({
    address: GOODDOLLAR,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [getAddress(to), gWei(amountHuman)],
    type: "legacy", // Celo uses legacy transactions
  });
  await pub.waitForTransactionReceipt({ hash });
  return hash;
}
