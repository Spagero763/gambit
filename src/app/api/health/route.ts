import { NextResponse } from "next/server";
import { relayerConfigured, relayerDiagnostics } from "@/lib/server/settle";
import { celo } from "viem/chains";

export const runtime = "nodejs";

// Warn well before the relayer can't pay gas. A settlement costs ~0.001 CELO,
// so 0.05 CELO is roughly a 50-payout buffer — plenty of lead time to top up.
const MIN_GAS_CELO = 0.05;

/**
 * Public health check for the settlement relayer. Returns HTTP 503 when the
 * relayer's mainnet CELO is below the gas threshold, so a free uptime monitor
 * (e.g. UptimeRobot) pointed at this URL will alert you to top it up. Exposes
 * only on-chain-public data (the relayer address + its balance) — never the key.
 */
export async function GET() {
  try {
    if (!relayerConfigured()) {
      return NextResponse.json({ ok: false, error: "relayer not configured" }, { status: 503 });
    }
    const d = await relayerDiagnostics();
    const mainnetWei = BigInt(d.balances[String(celo.id)] ?? "0");
    const balanceCELO = Number(mainnetWei) / 1e18;
    const lowGas = balanceCELO < MIN_GAS_CELO;
    const body = {
      ok: !lowGas,
      relayer: d.address,
      balanceCELO: Number(balanceCELO.toFixed(4)),
      thresholdCELO: MIN_GAS_CELO,
      lowGas,
      balances: d.balances,
    };
    return NextResponse.json(body, { status: lowGas ? 503 : 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "health check failed" }, { status: 500 });
  }
}
