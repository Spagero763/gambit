import { NextRequest, NextResponse } from "next/server";
import { recoverMessageAddress } from "viem";
import { supabaseAdmin } from "@/lib/supabase";
import { createToken } from "@/lib/server/profileToken";
import { creditVerifiedReferral } from "@/lib/server/referral";

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

// Short, human-friendly referral code (no wallet details in the link).
const CODE_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
function newRefCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(7));
  return Array.from(bytes, (b) => CODE_CHARS[b % 36]).join("");
}

/** Make sure a profile has a ref_code; returns the (possibly updated) row.
 *  Fails soft if the column doesn't exist yet, so profiles keep working. */
async function ensureRefCode(db: ReturnType<typeof supabaseAdmin>, row: any) {
  if (!row || row.ref_code) return row;
  try {
    for (let i = 0; i < 3; i++) {
      const code = newRefCode();
      const { data, error } = await db
        .from("profiles")
        .update({ ref_code: code })
        .eq("address", row.address)
        .is("ref_code", null)
        .select("*")
        .maybeSingle();
      if (!error && data) return data;
      if (error && !String(error.message).includes("duplicate")) return row; // column missing etc.
    }
  } catch {
    /* keep the row as-is */
  }
  return row;
}

/** GET /api/profile?address=0x... -> { profile } */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });
  try {
    const db = supabaseAdmin();
    const { data } = await db.from("profiles").select("*").eq("address", address).maybeSingle();
    const withCode = await ensureRefCode(db, data);
    return NextResponse.json({ profile: withCode ?? null });
  } catch {
    // Supabase not configured — behave as "no profile" so the app still runs.
    return NextResponse.json({ profile: null });
  }
}

/** POST /api/profile  { address, message, signature, profile } -> { profile, token } */
export async function POST(req: NextRequest) {
  try {
    const { address, message, signature, profile, referredBy } = await req.json();
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
    const db = supabaseAdmin();

    // referral is set once, on first creation, and never to yourself. The ref
    // can be a wallet address (legacy links) or a short ref_code.
    const { data: existing } = await db.from("profiles").select("referred_by").eq("address", addr).maybeSingle();
    let referred_by: string | null = (existing?.referred_by as string | null) ?? null;
    if (!referred_by && typeof referredBy === "string") {
      const r = referredBy.toLowerCase().trim();
      if (/^0x[0-9a-f]{40}$/.test(r)) {
        if (r !== addr) referred_by = r;
      } else if (/^[a-z0-9]{5,12}$/.test(r)) {
        try {
          const { data: inviter } = await db.from("profiles").select("address").eq("ref_code", r).maybeSingle();
          if (inviter?.address && inviter.address !== addr) referred_by = inviter.address;
        } catch {
          /* ref_code column missing — ignore the code */
        }
      }
    }

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
      referred_by,
    };

    const { data, error } = await db.from("profiles").upsert(row, { onConflict: "address" }).select("*").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const withCode = await ensureRefCode(db, data ?? { ...row, ref_code: null });

    // referred friend who has played and verified as human -> pay the inviter
    // (fire and forget; the on-chain key makes double-pay impossible)
    if (referred_by && row.played > 0) void creditVerifiedReferral(addr);

    return NextResponse.json({ profile: withCode ?? row, token: createToken(addr) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
