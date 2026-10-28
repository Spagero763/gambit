import { NextRequest, NextResponse } from "next/server";
import { rewardsSummary } from "@/lib/server/rewards";
import { limited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

/** GET /api/rewards?address=0x… → cashback and invite earnings, waiting and paid. */
export async function GET(req: NextRequest) {
  const rl = limited(req, "rewards", 30, 60_000);
  if (rl) return rl;
  const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
  if (!address || !/^0x[0-9a-f]{40}$/.test(address)) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }
  try {
    const s = await rewardsSummary(address);
    return NextResponse.json({ cashback: s.cashback, referral: s.referral, minimum: s.minimum });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
