import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Register a match the client just created on-chain. The server records it so it
 * can be authoritative over play. Idempotent on the match id.
 *
 * Body: { id, game, chainId, stake, creator }
 */
export async function POST(req: NextRequest) {
  try {
    const { id, game, chainId, stake, creator } = await req.json();
    if (id === undefined || !game || !creator) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    const db = supabaseAdmin();
    const { error } = await db.from("matches").upsert(
      {
        id: Number(id),
        game,
        chain_id: Number(chainId),
        stake: String(stake),
        creator: String(creator).toLowerCase(),
        status: "open",
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
