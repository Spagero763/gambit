import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { referralPaid } from "@/lib/server/referral";

export const runtime = "nodejs";

/**
 * GET /api/referrals?address=0x... — the inviter's referral scoreboard:
 * everyone who joined with their link, whether each has activated (bonus paid
 * on-chain), and the running total earned. Public-read; addresses are only
 * echoed back as display data the inviter already owns.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
  if (!address || !/^0x[0-9a-f]{40}$/.test(address)) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }
  try {
    const db = supabaseAdmin();
    const { data } = await db
      .from("profiles")
      .select("address,name,avatar,played")
      .eq("referred_by", address)
      .order("created_at", { ascending: false })
      .limit(50);
    const friends = data ?? [];

    // on-chain paid status per friend (capped; the list is small in practice)
    const perFriend = await Promise.all(
      friends.slice(0, 30).map(async (f) => {
        let paid = false;
        try {
          paid = await referralPaid(f.address);
        } catch {
          /* leave as pending on read failure */
        }
        return { name: f.name || null, played: f.played ?? 0, paid };
      })
    );

    const activated = perFriend.filter((f) => f.paid).length;
    const per = Number(process.env.REFERRAL_USDM ?? "0");
    return NextResponse.json({
      invited: friends.length,
      activated,
      earned: Number((activated * per).toFixed(2)),
      perFriend: per,
      friends: perFriend,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
