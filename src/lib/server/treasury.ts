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

/** Dry-run a tiny G$ transfer to surface whether payouts will work (no tx sent).
 *  Uses an eth_call simulation (like the real transfer) rather than gas
 *  estimation, which reverts spuriously for G$ on Celo. */
export async function treasuryDryRun(): Promise<{ ok: boolean; error?: string }> {
  try {
    const account = privateKeyToAccount(treasuryKey());
    const pub = createPublicClient({ chain: celo, transport: http(RPC) });
    await pub.simulateContract({
      address: GOODDOLLAR,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: ["0xa4fB1ED5abbaFC0820e5399aE9E61C9a3B16ACbe", gWei(0.001)],
      account,
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.shortMessage ?? e?.message ?? e).slice(0, 400) };
  }
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
    // explicit gas: viem's eth_estimateGas reverts for G$ on Celo even though
    // the transfer itself is valid (an eth_call simulation succeeds), so we set
    // a fixed limit to skip estimation. Kept tight (a G$ transfer uses ~80-130k)
    // because the pre-flight cost check is limit × gasPrice, and Celo's gas
    // price spikes — too high a limit fails when the treasury's CELO is low.
    gas: BigInt(150000),
  });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("G$ transfer reverted");
  return hash;
}
