import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/server/profileToken";
import { limited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

const MAX_LEN = 200;

/** GET ?id= → last 50 messages for a match (public, like the game state). */
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const db = supabaseAdmin();
    const { data } = await db
      .from("match_messages")
      .select("id,sender,body,created_at")
      .eq("match_id", Number(id))
      .order("id", { ascending: false })
      .limit(50);
    return NextResponse.json({ messages: (data ?? []).reverse() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}

/** POST { id, player, body, token } — only a seated, signed-in player may chat. */
export async function POST(req: NextRequest) {
  try {
    const rl = limited(req, "chat", 20, 10_000);
    if (rl) return rl;
    const { id, player, body, token } = await req.json();
    const text = String(body ?? "").trim().slice(0, MAX_LEN);
    if (!id || !player || !text) return NextResponse.json({ error: "Bad request" }, { status: 400 });

    const sender = String(player).toLowerCase();
    if (verifyToken(String(token)) !== sender) {
      return NextResponse.json({ error: "Sign in to chat" }, { status: 401 });
    }

    const db = supabaseAdmin();
    const { data: match } = await db.from("matches").select("creator,opponent,status").eq("id", Number(id)).maybeSingle();
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    const seated = [match.creator?.toLowerCase(), match.opponent?.toLowerCase()].includes(sender);
    if (!seated) return NextResponse.json({ error: "Not in this match" }, { status: 403 });

    const { error } = await db.from("match_messages").insert({ match_id: Number(id), sender, body: text });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
