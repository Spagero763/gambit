import { NextRequest, NextResponse } from "next/server";
import { goodIdRoot } from "@/lib/server/goodid";
import { limited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

/**
 * GET /api/goodid?address=0x... -> { verified }
 * Reads GoodDollar's Identity contract server-side (with RPC failover), so the
 * profile can show verification status reliably — no client SDK, no wallet
 * client, no silent failures. The client SDK is only needed for the actual
 * face-verification flow, not for checking status.
 */
export async function GET(req: NextRequest) {
  const rl = limited(req, "goodid", 30, 60_000);
  if (rl) return rl;
  const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
  if (!address || !/^0x[0-9a-f]{40}$/.test(address)) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }
  try {
    const root = await goodIdRoot(address);
    return NextResponse.json({ verified: !!root });
  } catch {
    // identity read failed — report unknown rather than a hard error so the
    // UI can still show the verify button
    return NextResponse.json({ verified: null });
  }
}
