import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { settleOnChain, relayerConfigured } from "@/lib/server/settle";

export const runtime = "nodejs";

/**
 * Re-drive settlement for a match stuck in `settling` (e.g. the relayer was out
 * of gas, or settling on the wrong chain). Idempotent-ish: succeeds once the
 * on-chain declareResult lands; otherwise records the latest error.
 *
 * Body: { id }
 */
export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (id === undefined) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const db = supabaseAdmin();

    const { data: match, error } = await db.from("matches").select("*").eq("id", Number(id)).single();
    if (error || !match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    if (match.status === "settled") {
      return NextResponse.json({ ok: true, settled: true, settleTx: match.settle_tx });
    }
    if (match.status !== "settling") {
      return NextResponse.json({ error: "Match is not awaiting settlement" }, { status: 409 });
    }
    if (!relayerConfigured()) {
      return NextResponse.json({ error: "Relayer not configured" }, { status: 500 });
    }

    try {
      const settleTx = await settleOnChain(BigInt(id), match.winner ?? null, Number(match.chain_id));
      await db.from("matches").update({ status: "settled", settle_tx: settleTx, settle_error: null }).eq("id", Number(id));
      return NextResponse.json({ ok: true, settled: true, settleTx });
    } catch (e: any) {
      const settle_error = String(e?.shortMessage ?? e?.message ?? "settle failed").slice(0, 300);
      await db.from("matches").update({ settle_error }).eq("id", Number(id));
      return NextResponse.json({ ok: false, settled: false, error: settle_error }, { status: 200 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
