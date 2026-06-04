import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo, celoSepolia } from "viem/chains";
import { ESCROW_ABI, ESCROW_ADDRESS } from "@/lib/escrow";

export const runtime = "nodejs";

const CHAIN = process.env.NEXT_PUBLIC_CHAIN === "mainnet" ? celo : celoSepolia;
const RPC =
  CHAIN.id === celo.id
    ? "https://forno.celo.org"
    : "https://forno.celo-sepolia.celo-testnet.org";

/**
 * Trusted relayer endpoint. The backend decides the winner from authoritative
 * game state and calls declareResult on the escrow. The relayer key lives only
 * in the server env (RELAYER_PRIVATE_KEY), never in the client.
 *
 * Body: { matchId: string, ranking: string[] }   // ranking[0] is the winner
 */
export async function POST(req: NextRequest) {
  try {
    const key = process.env.RELAYER_PRIVATE_KEY as `0x${string}` | undefined;
    if (!key) {
      return NextResponse.json({ error: "Relayer not configured" }, { status: 503 });
    }

    const { matchId, ranking } = await req.json();
    if (matchId === undefined || !Array.isArray(ranking) || ranking.length === 0) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const id = BigInt(matchId);
    const winners = (ranking as string[]).map((a) =>
      a === "0x0000000000000000000000000000000000000000" ? a : getAddress(a)
    ) as `0x${string}`[];

    const escrow = ESCROW_ADDRESS[CHAIN.id];
    if (!escrow) {
      return NextResponse.json({ error: "No escrow on this chain" }, { status: 503 });
    }

    const account = privateKeyToAccount(key);
    const wallet = createWalletClient({ account, chain: CHAIN, transport: http(RPC) });
    const pub = createPublicClient({ chain: CHAIN, transport: http(RPC) });

    // Celo / MiniPay accept legacy transactions.
    const hash = await wallet.writeContract({
      address: escrow,
      abi: ESCROW_ABI,
      functionName: "declareResult",
      args: [id, winners],
      type: "legacy",
    });
    await pub.waitForTransactionReceipt({ hash });

    return NextResponse.json({ ok: true, hash });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.shortMessage ?? e?.message ?? "Settle failed" },
      { status: 500 }
    );
  }
}
