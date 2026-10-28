import { NextRequest, NextResponse } from "next/server";
import { sweepProfit } from "@/lib/server/rewards";
import { isOwner } from "@/lib/server/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { token } → move the treasury's surplus (everything not owed as rewards) to the profit wallet. Owner only. */
export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({}));
  if (!isOwner(token)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    return NextResponse.json(await sweepProfit());
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
