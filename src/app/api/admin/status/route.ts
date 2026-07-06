import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, parseAbi, formatUnits } from "viem";
import { supabaseAdmin } from "@/lib/supabase";
import { isOwner } from "@/lib/server/admin";
import { relayerConfigured, relayerDiagnostics } from "@/lib/server/settle";
import { celoReadTransport } from "@/lib/server/rpc";
import { celo } from "viem/chains";

export const runtime = "nodejs";

const MIN_GAS_CELO = 0.05;
const USDM = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;
const GDOLLAR = "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A" as const;
const erc20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);

const envAddr = (name: string): `0x${string}` | null => {
  const a = process.env[name]?.trim();
  return a && a.startsWith("0x") && a.length === 42 ? (a as `0x${string}`) : null;
};

/** Balances of the three prize vaults + low-fund flags, for the ops card. */
async function vaultStatus() {
  const pub = createPublicClient({ chain: celo, transport: celoReadTransport() });
  const read = async (token: `0x${string}`, holder: `0x${string}` | null) =>
    holder ? Number(formatUnits((await pub.readContract({ address: token, abi: erc20, functionName: "balanceOf", args: [holder] })) as bigint, 18)) : null;

  const cupAddr = envAddr("CUP_CONTRACT");
  const claimAddr = envAddr("CLAIM_CONTRACT");
  const refAddr = envAddr("REWARDS_CONTRACT");
  const [cup, claims, referral] = await Promise.all([read(USDM, cupAddr), read(GDOLLAR, claimAddr), read(USDM, refAddr)]);

  const cupPrize = Number(process.env.CUP_PRIZE_USDM ?? "10");
  const dailyG = Number(process.env.DAILY_G_AMOUNT ?? "1");
  const refPer = Number(process.env.REFERRAL_USDM ?? "0");
  return {
    cup: cup === null ? null : { address: cupAddr, balance: cup, low: cup < cupPrize },
    claims: claims === null ? null : { address: claimAddr, balance: claims, low: claims < dailyG * 5 },
    referral: referral === null ? null : { address: refAddr, balance: referral, low: refPer > 0 && referral < refPer * 5 },
  };
}

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

    let vaults = null;
    try {
      vaults = await vaultStatus();
    } catch {
      /* vault reads are best-effort — the panel still works without them */
    }

    return NextResponse.json({ relayer, vaults, matches: matches ?? [], tournaments: tournaments ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
