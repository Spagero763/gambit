import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { rewardsSummary } from "@/lib/server/rewards";
import { limited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

/**
 * GET /api/referrals?address=0x… → everyone who joined with this player's link
 * and what each has earned them so far (1% of the friend's entry on every
 * decided money match), plus the inviter's totals. Public read; friends are
 * returned by name only.
 */
export async function GET(req: NextRequest) {
  const rl = limited(req, "referrals", 20, 60_000);
  if (rl) return rl;
  const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
  if (!address || !/^0x[0-9a-f]{40}$/.test(address)) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }
  try {
    const db = supabaseAdmin();
    const [{ data }, summary] = await Promise.all([
      db.from("profiles").select("address,name,played").eq("referred_by", address).order("created_at", { ascending: false }).limit(50),
      rewardsSummary(address),
    ]);
    const friends = (data ?? []).map((f: any) => ({
      name: f.name || null,
      played: f.played ?? 0,
      earned: summary.byFriend[f.address] ?? 0,
    }));
    return NextResponse.json({ invited: friends.length, earned: summary.referral, minimum: summary.minimum, friends });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
