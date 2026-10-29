import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { readMatchOnChain } from "@/lib/server/settle";
import { limited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

/**
 * A creator just cancelled their room on-chain. Mark the row so the lobby stops
 * listing it. The escrow is the only input: nothing changes unless the chain
 * already says the room is cancelled, so anyone may call this.
 *
 * Body: { id }
 */
export async function POST(req: NextRequest) {
  try {
    const rl = limited(req, "cancelled", 10, 60_000);
    if (rl) return rl;
    const { id } = await req.json();
    if (id === undefined || !/^\d+$/.test(String(id))) return NextResponse.json({ error: "Bad request" }, { status: 400 });

    const db = supabaseAdmin();
    const { data: row } = await db.from("matches").select("chain_id,status").eq("id", Number(id)).maybeSingle();
    if (!row) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (row.status !== "open") return NextResponse.json({ ok: true });

    const oc = await readMatchOnChain(BigInt(id), Number(row.chain_id));
    // 4 = Cancelled. A node that hasn't seen the cancel yet still says Open;
    // 409 tells the client to ask again in a moment.
    if (oc.status !== 4) return NextResponse.json({ error: "Not cancelled on-chain yet" }, { status: 409 });

    await db.from("matches").update({ status: "cancelled" }).eq("id", Number(id)).eq("status", "open");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
