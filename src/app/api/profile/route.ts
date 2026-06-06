import { NextRequest, NextResponse } from "next/server";
import { recoverMessageAddress } from "viem";
import { supabaseAdmin } from "@/lib/supabase";
import { createToken } from "@/lib/server/profileToken";

export const runtime = "nodejs";

const AVATARS = ["teal", "violet", "amber", "rose", "sky", "lime"];

/** The exact message a wallet signs to prove ownership before we save a profile. */
function profileMessage(address: string) {
  return `Sign in to Gambit\nAddress: ${address.toLowerCase()}`;
}

const clampInt = (v: unknown, max = 1e9) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0;
};

/** GET /api/profile?address=0x... -> { profile } */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });
  try {
    const db = supabaseAdmin();
    const { data } = await db.from("profiles").select("*").eq("address", address).maybeSingle();
    return NextResponse.json({ profile: data ?? null });
  } catch {
    // Supabase not configured — behave as "no profile" so the app still runs.
    return NextResponse.json({ profile: null });
  }
}

/** POST /api/profile  { address, message, signature, profile } -> { profile, token } */
export async function POST(req: NextRequest) {
  try {
    const { address, message, signature, profile } = await req.json();
    if (!address || !message || !signature) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    const addr = String(address).toLowerCase();
    if (message !== profileMessage(addr)) {
      return NextResponse.json({ error: "Unexpected message" }, { status: 400 });
    }
    const recovered = await recoverMessageAddress({ message, signature });
    if (recovered.toLowerCase() !== addr) {
      return NextResponse.json({ error: "Bad signature" }, { status: 401 });
    }

    const img = typeof profile?.avatarImage === "string" && profile.avatarImage.length < 120000 ? profile.avatarImage : null;
    const row = {
      address: addr,
      name: String(profile?.name ?? "").slice(0, 24),
      avatar: AVATARS.includes(profile?.avatar) ? profile.avatar : "teal",
      avatar_image: img,
      xp: clampInt(profile?.xp),
      streak: clampInt(profile?.streak, 100000),
      last_played: typeof profile?.lastPlayed === "string" ? profile.lastPlayed.slice(0, 10) : null,
      played: clampInt(profile?.played),
      wins: clampInt(profile?.wins),
    };

    const db = supabaseAdmin();
    const { data, error } = await db.from("profiles").upsert(row, { onConflict: "address" }).select("*").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ profile: data ?? row, token: createToken(addr) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
