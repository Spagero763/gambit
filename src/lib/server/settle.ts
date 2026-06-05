import { createWalletClient, createPublicClient, http, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo, celoSepolia } from "viem/chains";
import { ESCROW_ABI, ESCROW_ADDRESS } from "@/lib/escrow";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

const CHAIN = process.env.NEXT_PUBLIC_CHAIN === "mainnet" ? celo : celoSepolia;
const RPC =
  CHAIN.id === celo.id
    ? "https://forno.celo.org"
    : "https://forno.celo-sepolia.celo-testnet.org";

export function relayerConfigured() {
  return !!process.env.RELAYER_PRIVATE_KEY && !!ESCROW_ADDRESS[CHAIN.id];
}

/**
 * Settle a match on-chain with the relayer key. `winner` null = draw.
 * Server-only; the key never leaves the server env.
 */
export async function settleOnChain(matchId: bigint, winner: string | null) {
  const key = process.env.RELAYER_PRIVATE_KEY as `0x${string}` | undefined;
  const escrow = ESCROW_ADDRESS[CHAIN.id];
  if (!key) throw new Error("Relayer not configured");
  if (!escrow) throw new Error("No escrow on this chain");

  const ranking = (winner ? [getAddress(winner)] : [ZERO]) as `0x${string}`[];

  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: CHAIN, transport: http(RPC) });
  const pub = createPublicClient({ chain: CHAIN, transport: http(RPC) });

  const hash = await wallet.writeContract({
    address: escrow,
    abi: ESCROW_ABI,
    functionName: "declareResult",
    args: [matchId, ranking],
    type: "legacy", // Celo / MiniPay use legacy transactions
  });
  await pub.waitForTransactionReceipt({ hash });
  return hash;
}
