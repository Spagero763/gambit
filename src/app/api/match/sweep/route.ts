import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cancelOnChain, readMatchOnChain, relayerConfigured } from "@/lib/server/settle";
import { ACTIVE_CHAIN_ID } from "@/lib/wagmi";

export const runtime = "nodejs";

// Refund rooms that nobody joined.
//
// A staked room has a 10 minute join window. Miss it and the room is dead: the
// contract will not let anyone join, but it also does not hand the money back on
// its own. Until this existed nothing ever called cancelMatch, so an unfilled
// room simply sat there holding the creator's stake — one had been stuck for
// eighteen days. The money was never lost (cancelMatch is permissionless once
// the window lapses, so anyone could always have freed it) but nobody was
// actually doing it, which to the player is the same thing.
//
// The contract is the guard rail here, not this code. cancelMatch only touches a
// room that is still Open and past its deadline, and it can only pay the
// original stakers. There is no argument this route could pass that sends money
// anywhere else, which is what makes it safe to run unattended.
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
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("matches")
      .select("id,chain_id,status")
      .eq("status", "open")
      .order("id", { ascending: true })
      .limit(50);

    // Surface it. Swallowing this once already made an empty result look like
    // "nothing to refund" when the query itself had failed.
    if (error) {
      return NextResponse.json({ ok: false, stage: "read", error: error.message }, { status: 500 });
    }
    const rows = data ?? [];
    const now = Math.floor(Date.now() / 1000);
    const refunded: number[] = [];
    const skipped: { id: number; why: string }[] = [];

    for (const row of rows) {
      if (refunded.length >= MAX_PER_RUN) break;
      const id = Number(row.id);
      const chainId = Number(row.chain_id) || ACTIVE_CHAIN_ID;
      try {
        // The chain decides, never the database. A row can say "open" while the
        // match was already filled or cancelled elsewhere.
        const m = await readMatchOnChain(BigInt(id), chainId);
        if (m.status !== 1) {
          // already moved on — reconcile the row so it stops being scanned
          await db
            .from("matches")
            .update({ status: m.status === 4 ? "cancelled" : m.status === 3 ? "settled" : "active" })
            .eq("id", id);
          skipped.push({ id, why: `on-chain status ${m.status}` });
          continue;
        }
        if (now <= m.joinDeadline) {
          skipped.push({ id, why: "still joinable" });
          continue;
        }
        await cancelOnChain(BigInt(id), chainId);
        await db.from("matches").update({ status: "cancelled" }).eq("id", id);
        refunded.push(id);
      } catch (e: any) {
        // One bad match must not stop the rest. A revert here usually means
        // somebody else cancelled it first, which is a fine outcome.
        skipped.push({ id, why: String(e?.shortMessage ?? e?.message ?? "failed").slice(0, 120) });
      }
    }

    return NextResponse.json({ ok: true, refunded, skipped, scanned: rows.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "sweep failed" }, { status: 500 });
  }
}
