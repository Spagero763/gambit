import { createWalletClient, createPublicClient, http, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo, celoSepolia } from "viem/chains";
import { ESCROW_ABI, ESCROW_ADDRESS } from "@/lib/escrow";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

// Settle on the chain the match was actually created on — derived from the
// match's stored chain_id, NOT a global env var. This makes payouts robust to
// env drift (e.g. NEXT_PUBLIC_CHAIN being wrong on the server).
const CHAINS: Record<number, { chain: typeof celo | typeof celoSepolia; rpc: string }> = {
  [celo.id]: { chain: celo, rpc: "https://forno.celo.org" },
  [celoSepolia.id]: { chain: celoSepolia, rpc: "https://forno.celo-sepolia.celo-testnet.org" },
};

export function relayerConfigured() {
  return !!process.env.RELAYER_PRIVATE_KEY;
}

/** Normalise the relayer key: trim, strip quotes, ensure 0x-prefix. */
function relayerKey(): `0x${string}` {
  let k = process.env.RELAYER_PRIVATE_KEY?.trim();
  if (!k) throw new Error("Relayer not configured");
  k = k.replace(/^["']|["']$/g, "").trim();
  if (!k.startsWith("0x")) k = "0x" + k;
  return k as `0x${string}`;
}

/**
 * Settle a match on-chain with the relayer key. `winner` null = draw.
 * Server-only; the key never leaves the server env.
 */
export async function settleOnChain(matchId: bigint, winner: string | null, chainId: number) {
  const key = relayerKey();
  const cfg = CHAINS[chainId];
  if (!cfg) throw new Error(`Unsupported chain ${chainId}`);
  const escrow = ESCROW_ADDRESS[chainId];
  if (!escrow) throw new Error(`No escrow on chain ${chainId}`);

  const ranking = (winner ? [getAddress(winner)] : [ZERO]) as `0x${string}`[];

  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: cfg.chain, transport: http(cfg.rpc) });
  const pub = createPublicClient({ chain: cfg.chain, transport: http(cfg.rpc) });

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

/**
 * Settle a multi-player pot (tournament): pass the exact top-three finishers,
 * highest first. The contract pays them 50/30/20 of the pot (minus fee).
 */
export async function settleRanking(matchId: bigint, ranking: string[], chainId: number) {
  const key = relayerKey();
  const cfg = CHAINS[chainId];
  if (!cfg) throw new Error(`Unsupported chain ${chainId}`);
  const escrow = ESCROW_ADDRESS[chainId];
  if (!escrow) throw new Error(`No escrow on chain ${chainId}`);
  if (ranking.length !== 3) throw new Error("Ranking must be exactly the top three");

  const ordered = ranking.map((a) => getAddress(a)) as `0x${string}`[];
  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: cfg.chain, transport: http(cfg.rpc) });
  const pub = createPublicClient({ chain: cfg.chain, transport: http(cfg.rpc) });

  const hash = await wallet.writeContract({
    address: escrow,
    abi: ESCROW_ABI,
    functionName: "declareResult",
    args: [matchId, ordered],
    type: "legacy",
  });
  await pub.waitForTransactionReceipt({ hash });
  return hash;
}
