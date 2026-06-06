import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/server/profileToken";

export const runtime = "nodejs";

const clampInt = (v: unknown, max = 1e9) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0;
};

/**
 * POST /api/profile/sync  { token, progress } -> { ok }
 * Token-authenticated progression sync (no wallet signature needed per update).
 */
export async function POST(req: NextRequest) {
  try {
    const { token, progress } = await req.json();
    const addr = token ? verifyToken(String(token)) : null;
    if (!addr) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const row: Record<string, unknown> = {
      xp: clampInt(progress?.xp),
      streak: clampInt(progress?.streak, 100000),
      played: clampInt(progress?.played),
      wins: clampInt(progress?.wins),
    };
    if (typeof progress?.lastPlayed === "string") row.last_played = progress.lastPlayed.slice(0, 10);

    const db = supabaseAdmin();
    const { error } = await db.from("profiles").update(row).eq("address", addr);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
