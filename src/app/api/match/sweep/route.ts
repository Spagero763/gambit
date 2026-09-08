import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  cancelOnChain,
  readMatchOnChain,
  readNextMatchId,
  relayerConfigured,
} from "@/lib/server/settle";
import { ACTIVE_CHAIN_ID } from "@/lib/wagmi";

export const runtime = "nodejs";

// Refund rooms that nobody joined.
//
// A staked room has a ten minute join window. Miss it and the contract refuses
// further joins, but it does not hand the money back on its own. Until this
// existed nothing ever called cancelMatch, so an unfilled room sat there holding
// the creator's stake — one had been stuck for eighteen days. The money was
// never lost, since cancelMatch is permissionless once the window lapses, but
// nobody was actually doing it, which to the player is the same thing.
//
// Work is found ON-CHAIN, not in the database. The first version of this route
// listed `status = open` rows instead and came back having scanned nothing at
// all, and the database is the weaker source anyway: several rows still said
// open for matches cancelled weeks earlier, and a match whose register call
// failed would have no row to find. The chain always knows.
//
// The contract is the guard rail, not this code. cancelMatch only touches a room
// that is still Open and past its deadline, and it can only pay the original
// stakers. There is no argument this route could pass that sends money somewhere
// else, which is what makes it safe to run unattended.
const SCAN_DEPTH = 60; // ids back from the newest — comfortably covers the backlog
const MAX_PER_RUN = 5; // keep one invocation cheap; the next run takes the rest

export async function GET(req: NextRequest) {
  return sweep(req);
}
export async function POST(req: NextRequest) {
  return sweep(req);
}

async function sweep(_req: NextRequest) {
  if (!relayerConfigured()) {
    return NextResponse.json({ ok: false, reason: "relayer not configured" });
  }
  try {
    const chainId = ACTIVE_CHAIN_ID;
    const nextId = await readNextMatchId(chainId);
    const from = Math.max(1, nextId - SCAN_DEPTH);

    const now = Math.floor(Date.now() / 1000);
    const refunded: { id: number; tx: string }[] = [];
    const failed: { id: number; why: string }[] = [];
    let stillOpen = 0;

    for (let id = from; id < nextId; id++) {
      if (refunded.length >= MAX_PER_RUN) break;
      try {
        const m = await readMatchOnChain(BigInt(id), chainId);
        if (m.status !== 1) continue; // not Open: settled, cancelled, or never created
        if (now <= m.joinDeadline) {
          stillOpen += 1; // genuinely live, leave it alone
          continue;
        }
        const tx = await cancelOnChain(BigInt(id), chainId);
        refunded.push({ id, tx });
      } catch (e: any) {
        // One bad match must not stop the rest. A revert usually means somebody
        // else cancelled it first, which is a perfectly good outcome.
        failed.push({ id, why: String(e?.shortMessage ?? e?.message ?? "failed").slice(0, 120) });
      }
    }

    // Best effort only. The refund already happened on-chain, and a stale row is
    // cosmetic next to that, so a database hiccup must not fail the response.
    if (refunded.length) {
      try {
        const db = supabaseAdmin();
        await db
          .from("matches")
          .update({ status: "cancelled" })
          .in(
            "id",
            refunded.map((r) => r.id)
          );
      } catch {
        /* rows stay stale; the next sweep reads the chain regardless */
      }
    }

    return NextResponse.json({
      ok: true,
      scanned: `${from}..${nextId - 1}`,
      stillOpen,
      refunded,
      failed,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "sweep failed" }, { status: 500 });
  }
}
