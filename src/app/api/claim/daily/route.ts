import { NextRequest, NextResponse } from "next/server";
import { formatUnits } from "viem";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/server/profileToken";
import { treasuryConfigured, treasuryAddress, treasuryGBalance, payDailyG, gWei } from "@/lib/server/treasury";

export const runtime = "nodejs";

// G$ paid per daily claim (configurable; small by design — this is a faucet).
const DAILY_G = Number(process.env.DAILY_G_AMOUNT ?? "1");
const today = () => new Date().toISOString().slice(0, 10);

/** Status check (no secrets): is the treasury set up and funded to pay $G? */
export async function GET() {
  const address = treasuryAddress();
  if (!address) return NextResponse.json({ configured: false, dailyG: DAILY_G });
  try {
    const bal = await treasuryGBalance();
    return NextResponse.json({ configured: true, address, gBalance: formatUnits(bal, 18), dailyG: DAILY_G });
  } catch {
    return NextResponse.json({ configured: true, address, error: "balance read failed" });
  }
}

/**
 * Daily G$ reward. The XP half is handled client-side (localStorage); this pays
 * a little real G$ on top, once per day per signed-in profile, from the
 * treasury. Fails soft to `gAmount: 0` (no error) whenever it can't pay — no
 * profile, already claimed, treasury unset/empty — so the XP claim still works.
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    const addr = verifyToken(String(token ?? ""));
    if (!addr) return NextResponse.json({ gAmount: 0, reason: "signin" });

    const db = supabaseAdmin();
    let { data: prof } = await db
      .from("profiles")
      .select("address,last_g_claim")
      .eq("address", addr)
      .maybeSingle();

    // first-time claimer with no saved profile yet — create a minimal row so we
    // can track the daily claim (the token already proved wallet ownership).
    if (!prof) {
      await db.from("profiles").upsert({ address: addr, name: "", avatar: "teal" }, { onConflict: "address", ignoreDuplicates: true });
      prof = { address: addr, last_g_claim: null };
    }
    if (prof.last_g_claim === today()) return NextResponse.json({ gAmount: 0, reason: "already" });
    if (!treasuryConfigured()) return NextResponse.json({ gAmount: 0, reason: "no-treasury" });

    let bal = BigInt(0);
    try {
      bal = await treasuryGBalance();
    } catch {
      return NextResponse.json({ gAmount: 0, reason: "treasury-error" });
    }
    if (bal < gWei(DAILY_G)) return NextResponse.json({ gAmount: 0, reason: "treasury-empty" });

    // claim the day FIRST (guards against double-send on a quick retry), then pay
    const prev = prof.last_g_claim ?? null;
    await db.from("profiles").update({ last_g_claim: today() }).eq("address", addr);
    try {
      const tx = await payDailyG(addr, DAILY_G);
      return NextResponse.json({ gAmount: DAILY_G, tx });
    } catch {
      // payment failed — restore the previous claim date so they can retry
      await db.from("profiles").update({ last_g_claim: prev }).eq("address", addr);
      return NextResponse.json({ gAmount: 0, reason: "send-failed" });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
