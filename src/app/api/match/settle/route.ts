import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { settleOnChain, relayerConfigured } from "@/lib/server/settle";

export const runtime = "nodejs";

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
    const { id, refund, secret } = await req.json();
    if (id === undefined) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const db = supabaseAdmin();

    const { data: match, error } = await db.from("matches").select("*").eq("id", Number(id)).single();
    if (error || !match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

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
      const settleTx = await settleOnChain(BigInt(id), winner, Number(match.chain_id));
      await db.from("matches").update({ status: "settled", settle_tx: settleTx, winner, settle_error: null }).eq("id", Number(id));
      return NextResponse.json({ ok: true, settled: true, refunded: !winner, settleTx });
    } catch (e: any) {
      const settle_error = String(e?.shortMessage ?? e?.message ?? "settle failed").slice(0, 300);
      await db.from("matches").update({ settle_error }).eq("id", Number(id));
      return NextResponse.json({ ok: false, settled: false, error: settle_error }, { status: 200 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
