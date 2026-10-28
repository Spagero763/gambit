import { NextRequest, NextResponse } from "next/server";
import { payRewards } from "@/lib/server/rewards";
import { isOwner } from "@/lib/server/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel's daily cron calls this with GET and the CRON_SECRET bearer; the
// owner can also run it from the admin page with their session token.
const fromCron = (req: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
};

async function run() {
  try {
    return NextResponse.json(await payRewards());
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!fromCron(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return run();
}

export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({}));
  if (!fromCron(req) && !isOwner(token)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return run();
}
