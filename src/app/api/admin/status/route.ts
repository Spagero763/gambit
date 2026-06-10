import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isOwner } from "@/lib/server/admin";
import { relayerConfigured, relayerDiagnostics } from "@/lib/server/settle";
import { celo } from "viem/chains";

export const runtime = "nodejs";

const MIN_GAS_CELO = 0.05;

/** Owner-only operations dashboard: relayer gas + anything needing attention. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!isOwner(token)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const db = supabaseAdmin();

    let relayer: { address: string; balanceCELO: number; lowGas: boolean } | null = null;
    if (relayerConfigured()) {
      const d = await relayerDiagnostics();
      const bal = Number(BigInt(d.balances[String(celo.id)] ?? "0")) / 1e18;
      relayer = { address: d.address, balanceCELO: Number(bal.toFixed(4)), lowGas: bal < MIN_GAS_CELO };
    }

    // Matches awaiting payout or with a recorded settle error.
    const { data: matches } = await db
      .from("matches")
      .select("id,game,chain_id,status,winner,settle_error,updated_at")
      .or("status.eq.settling,settle_error.not.is.null")
      .order("updated_at", { ascending: false })
      .limit(50);

    // Tournaments still in flight or with a settle error.
    const { data: tournaments } = await db
      .from("tournaments")
      .select("id,chain_id,status,winners,settle_error,capacity,updated_at")
      .or("status.in.(active,settling),settle_error.not.is.null")
      .order("updated_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ relayer, matches: matches ?? [], tournaments: tournaments ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
