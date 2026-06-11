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

/** Read a match's on-chain Status enum (1=Open 2=Active 3=Settled 4=Cancelled).
 *  No key needed — public read. Lets the server reconcile DB rows to chain truth. */
export async function readMatchStatus(matchId: bigint, chainId: number): Promise<number> {
  const cfg = CHAINS[chainId];
  if (!cfg) throw new Error(`Unsupported chain ${chainId}`);
  const escrow = ESCROW_ADDRESS[chainId];
  if (!escrow) throw new Error(`No escrow on chain ${chainId}`);
  const pub = createPublicClient({ chain: cfg.chain, transport: http(cfg.rpc) });
  const m = (await pub.readContract({
    address: escrow,
    abi: ESCROW_ABI,
    functionName: "matches",
    args: [matchId],
  })) as readonly unknown[];
  return Number(m[9]); // struct field order: ...joined(8), status(9)
}

/** Read the on-chain match struct fields we need to verify identity before
 *  paying out (token, creator, stake, joined, status). Public read, no key. */
export async function readMatchOnChain(matchId: bigint, chainId: number) {
  const cfg = CHAINS[chainId];
  if (!cfg) throw new Error(`Unsupported chain ${chainId}`);
  const escrow = ESCROW_ADDRESS[chainId];
  if (!escrow) throw new Error(`No escrow on chain ${chainId}`);
  const pub = createPublicClient({ chain: cfg.chain, transport: http(cfg.rpc) });
  const m = (await pub.readContract({
    address: escrow,
    abi: ESCROW_ABI,
    functionName: "matches",
    args: [matchId],
  })) as readonly unknown[];
  return {
    token: String(m[0]).toLowerCase(),
    creator: String(m[1]).toLowerCase(),
    stake: BigInt(m[2] as bigint),
    joined: Number(m[8]),
    status: Number(m[9]),
  };
}

/** Who is ACTUALLY seated on-chain (lowercase). The source of truth for joins. */
export async function readMatchPlayers(matchId: bigint, chainId: number): Promise<string[]> {
  const cfg = CHAINS[chainId];
  if (!cfg) throw new Error(`Unsupported chain ${chainId}`);
  const escrow = ESCROW_ADDRESS[chainId];
  if (!escrow) throw new Error(`No escrow on chain ${chainId}`);
  const pub = createPublicClient({ chain: cfg.chain, transport: http(cfg.rpc) });
  const list = (await pub.readContract({
    address: escrow,
    abi: ESCROW_ABI,
    functionName: "players",
    args: [matchId],
  })) as readonly string[];
  return list.map((a) => a.toLowerCase());
}

/**
 * Relayer-driven cancelMatch: refunds every on-chain staker of an UNFILLED
 * match. The contract enforces who may call it (creator anytime while Open,
 * anyone once the join window has lapsed), so exposing this is safe — a revert
 * just means "not allowed yet".
 */
export async function cancelOnChain(matchId: bigint, chainId: number) {
  const key = relayerKey();
  const cfg = CHAINS[chainId];
  if (!cfg) throw new Error(`Unsupported chain ${chainId}`);
  const escrow = ESCROW_ADDRESS[chainId];
  if (!escrow) throw new Error(`No escrow on chain ${chainId}`);
  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: cfg.chain, transport: http(cfg.rpc) });
  const pub = createPublicClient({ chain: cfg.chain, transport: http(cfg.rpc) });
  const hash = await wallet.writeContract({
    address: escrow,
    abi: ESCROW_ABI,
    functionName: "cancelMatch",
    args: [matchId],
    type: "legacy",
  });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("cancelMatch reverted");
  return hash;
}

/** Diagnostics: the relayer's public address + CELO balance per chain. Never
 *  returns the key itself. Lets us see if the server's relayer is funded. */
export async function relayerDiagnostics() {
  const key = relayerKey();
  const account = privateKeyToAccount(key);
  const balances: Record<string, string> = {};
  for (const [idStr, cfg] of Object.entries(CHAINS)) {
    try {
      const pub = createPublicClient({ chain: cfg.chain, transport: http(cfg.rpc) });
      balances[idStr] = (await pub.getBalance({ address: account.address })).toString();
    } catch {
      balances[idStr] = "error";
    }
  }
  return { address: account.address, balances };
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
