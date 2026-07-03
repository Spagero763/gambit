import { NextRequest, NextResponse } from "next/server";
import { creditReferrals } from "@/lib/server/referral";
import { supabaseAdmin } from "@/lib/supabase";
import { settleOnChain, relayerConfigured, readMatchOnChain, relayerDiagnostics } from "@/lib/server/settle";
import { limited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

/** Admin diagnostic: GET ?secret=…  -> relayer address + per-chain balances. */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    return NextResponse.json({ relayer: relayerConfigured() ? await relayerDiagnostics() : null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}

/**
 * Re-drive settlement for a stuck match.
 *   - normal:  re-runs the recorded result (winner takes the pot).
 *   - refund:  pass { refund: true } to refund BOTH players (winner = none).
 *              Use for draws or any match that's stuck without a clear winner.
 *
 * Body: { id, refund? }
 */
export async function POST(req: NextRequest) {
  try {
    const rl = limited(req, "settle", 12, 10_000);
    if (rl) return rl;
    const { id, refund, secret, chainId: chainOverride } = await req.json();
    if (id === undefined) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const db = supabaseAdmin();

    const { data: match, error } = await db.from("matches").select("*").eq("id", Number(id)).single();
    if (error || !match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    // Recover a match whose stored chain_id is wrong (e.g. created during the
    // testnet→mainnet cutover): an admin may force settlement on a different
    // chain, but ONLY after we verify on-chain that it's the SAME match there
    // (identical creator + stake) and that it's still Active. This makes it
    // impossible to pay out a different escrow's match that happens to share id.
    let settleChainId = Number(match.chain_id);
    if (chainOverride !== undefined && chainOverride !== null) {
      if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const oc = await readMatchOnChain(BigInt(id), Number(chainOverride));
      const sameCreator = oc.creator === String(match.creator).toLowerCase();
      const sameStake = oc.stake === BigInt(match.stake);
      if (oc.status !== 2 /* Active */ || !sameCreator || !sameStake) {
        return NextResponse.json(
          { error: "Override chain does not hold this exact match (creator/stake/status mismatch)", onchain: { status: oc.status, sameCreator, sameStake } },
          { status: 409 }
        );
      }
      settleChainId = Number(chainOverride);
    }

    if (match.status === "settled") {
      return NextResponse.json({ ok: true, settled: true, settleTx: match.settle_tx });
    }
    // A forced refund (winner = none) is admin-only — otherwise anyone could
    // grief an in-progress match by refunding it. Players abandon-recover via
    // /api/match/claim (timeout forfeit) or the on-chain reclaimStalled instead.
    if (refund) {
      if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // normal retry needs a match already in `settling`; an admin refund can also
    // recover one stuck in `active` (e.g. a draw that never finalised).
    const recoverable = match.status === "settling" || (refund && match.status === "active");
    if (!recoverable) {
      return NextResponse.json({ error: "Match is not awaiting settlement" }, { status: 409 });
    }
    if (!relayerConfigured()) {
      return NextResponse.json({ error: "Relayer not configured" }, { status: 500 });
    }

    const winner = refund ? null : match.winner ?? null;
    try {
      const settleTx = await settleOnChain(BigInt(id), winner, settleChainId);
      // persist the corrected chain too, so the row matches on-chain reality
      await db.from("matches").update({ status: "settled", settle_tx: settleTx, winner, chain_id: settleChainId, settle_error: null }).eq("id", Number(id));
      void creditReferrals([match.creator, match.opponent]);
      return NextResponse.json({ ok: true, settled: true, refunded: !winner, settleTx, chainId: settleChainId });
    } catch (e: any) {
      const settle_error = String(e?.shortMessage ?? e?.message ?? "settle failed").slice(0, 300);
      await db.from("matches").update({ settle_error }).eq("id", Number(id));
      return NextResponse.json({ ok: false, settled: false, error: settle_error }, { status: 200 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
