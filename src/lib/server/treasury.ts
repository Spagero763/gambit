import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  getAddress,
  encodeFunctionData,
  keccak256,
  TransactionReceiptNotFoundError,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { ERC20_ABI } from "@/lib/escrow";
import { CELO_READ_URLS } from "@/lib/server/rpc";

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
  const hash = await sendToken(token, to, amountWei);
  if (!(await landed(hash))) throw new Error("token transfer reverted");
  return hash;
}

/** Broadcast a transfer and return its hash without waiting for it to land. */
export async function sendToken(token: `0x${string}`, to: string, amountWei: bigint): Promise<`0x${string}`> {
  const account = privateKeyToAccount(treasuryKey());
  const wallet = createWalletClient({ account, chain: celo, transport: http(RPC) });
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  const gasPrice = await pub.getGasPrice();
  return wallet.writeContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [getAddress(to), amountWei],
    type: "legacy",
    gas: BigInt(250000),
    gasPrice,
  });
}

/** Whether a sent transaction succeeded. Throws if it can't be confirmed in time. */
export async function landed(hash: `0x${string}`, timeout = 60_000): Promise<boolean> {
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  const receipt = await pub.waitForTransactionReceipt({ hash, timeout });
  return receipt.status === "success";
}

/** The treasury's next nonce. "pending" counts transfers still waiting to be mined. */
export async function treasuryNonce(blockTag: "latest" | "pending"): Promise<number> {
  const account = privateKeyToAccount(treasuryKey());
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  return pub.getTransactionCount({ address: account.address, blockTag });
}

export type Fees = { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint };

/** The cap leaves room for the base fee to rise; only the going rate is charged. */
export async function treasuryFees(): Promise<Fees> {
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  const { maxFeePerGas, maxPriorityFeePerGas } = await pub.estimateFeesPerGas();
  return { maxFeePerGas, maxPriorityFeePerGas };
}

const transferData = (to: string, amountWei: bigint) =>
  encodeFunctionData({ abi: ERC20_ABI, functionName: "transfer", args: [getAddress(to), amountWei] });

/** Dry-run a transfer and size its gas. Throws if it would revert, so a doomed one never costs anything. */
export async function transferGas(token: `0x${string}`, to: string, amountWei: bigint): Promise<bigint> {
  const account = privateKeyToAccount(treasuryKey());
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  const gas = await pub.estimateGas({ account: account.address, to: token, data: transferData(to, amountWei) });
  return (gas * BigInt(3)) / BigInt(2);
}

/**
 * Sign a transfer at a fixed nonce without sending it. Its hash is known before
 * anything leaves the wallet, so it can be written down first.
 */
export async function signTransfer(token: `0x${string}`, to: string, amountWei: bigint, nonce: number, gas: bigint, fees: Fees) {
  const account = privateKeyToAccount(treasuryKey());
  const raw = await account.signTransaction({
    chainId: celo.id,
    type: "eip1559",
    to: token,
    data: transferData(to, amountWei),
    nonce,
    gas,
    ...fees,
  });
  return { raw, hash: keccak256(raw) };
}

export async function sendRaw(raw: `0x${string}`) {
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  return pub.sendRawTransaction({ serializedTransaction: raw });
}

/**
 * How a sent transfer ended. null only when every endpoint says it was never
 * mined; if any of them can't be reached this throws instead of guessing.
 */
export async function receiptOf(hash: `0x${string}`): Promise<"success" | "reverted" | null> {
  let unsure: unknown = null;
  for (const url of CELO_READ_URLS) {
    try {
      const pub = createPublicClient({ chain: celo, transport: http(url, { timeout: 5_000, retryCount: 1 }) });
      return (await pub.getTransactionReceipt({ hash })).status;
    } catch (e) {
      if (!(e instanceof TransactionReceiptNotFoundError)) unsure = e;
    }
  }
  if (unsure) throw unsure;
  return null;
}

/** The treasury's balance of any ERC-20 (base units), and of CELO for gas. */
export async function treasuryBalances(tokens: `0x${string}`[]): Promise<{ celo: bigint; tokens: Record<string, bigint> }> {
  const account = privateKeyToAccount(treasuryKey());
  const pub = createPublicClient({ chain: celo, transport: http(RPC) });
  const [native, ...held] = await Promise.all([
    pub.getBalance({ address: account.address }),
    ...tokens.map((t) => pub.readContract({ address: t, abi: ERC20_ABI, functionName: "balanceOf", args: [account.address] }) as Promise<bigint>),
  ]);
  return { celo: native, tokens: Object.fromEntries(tokens.map((t, i) => [t.toLowerCase(), held[i]])) };
}
