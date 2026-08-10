import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { treasuryConfigured, treasuryUsdmBalance, payUsdm } from "@/lib/server/treasury";
import { cupContract, cupWeekSettledOnChain, cupVaultBalance, settleCupOnChain } from "@/lib/server/cupChain";
import { weekIndex, weekKey, weekEnd, CUP_SPLIT } from "@/lib/cup";
import { notify } from "@/lib/server/push";
import { limited } from "@/lib/server/rateLimit";
import { parseUnits } from "viem";

export const runtime = "nodejs";

/**
 * What is left of the Weekly Cup: settlement only.
 *
 * The cup itself is retired — there is no prize funding behind it, and a free
 * cup that cannot pay its podium is worse than no cup. Entry and score
 * submission are gone with it, so no one can join a week that will never pay.
 *
 * Settling stays, and stays public + idempotent, because players who already
 * placed in a finished week are owed their share. The owner triggers it from
 * /admin; the cup_weeks status guard means a retry never double-pays.
 */
const PRIZE_USDM = Number(process.env.CUP_PRIZE_USDM ?? "10");

interface Winner {
  address: string;
  amount: number;
  tx: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const rl = limited(req, "cup", 20, 60_000);
    if (rl) return rl;
    const body = await req.json();
    const action = String(body.action ?? "");
    const db = supabaseAdmin();

    if (action === "settle") {
      // Pay the top three of a FINISHED week. Public + idempotent: the
      // cup_weeks row is claimed first (status guard), each payment's tx is
      // persisted as it lands, and a retry only pays winners still missing one.
      const i = Number.isFinite(Number(body.week)) ? Number(body.week) : weekIndex() - 1;
      if (weekEnd(i) > Date.now()) {
        return NextResponse.json({ error: "That week isn't finished yet" }, { status: 409 });
      }
      const wk = weekKey(i);

      // make sure the row exists, then claim it (open -> settling, atomically)
      await db.from("cup_weeks").upsert({ week: wk }, { onConflict: "week", ignoreDuplicates: true });
      const { data: row } = await db.from("cup_weeks").select("*").eq("week", wk).maybeSingle();
      if (!row) return NextResponse.json({ error: "Cup week missing" }, { status: 500 });
      if (row.status === "settled") return NextResponse.json({ ok: true, settled: true, winners: row.winners });

      let winners: Winner[] | null = (row.winners as Winner[]) ?? null;
      if (row.status === "open") {
        const { data: claimed } = await db
          .from("cup_weeks")
          .update({ status: "settling" })
          .eq("week", wk)
          .eq("status", "open")
          .select();
        if (!claimed?.length) return NextResponse.json({ error: "Settling already in progress" }, { status: 409 });
      } else if (!row.settle_error && winners?.every((w) => w.tx)) {
        // settling, no error, everything paid — finish the bookkeeping below
      } else if (!row.settle_error && !winners) {
        return NextResponse.json({ error: "Settling already in progress" }, { status: 409 });
      }

      if (!winners) {
        // rank: best score first, ties broken deterministically by address.
        // Only players who actually played (score > 0) can win — and banned
        // wallets are skipped even if their entry row still exists.
        const { data: entries } = await db
          .from("cup_entries")
          .select("address,score")
          .eq("week", wk)
          .gt("score", 0)
          .order("score", { ascending: false })
          .order("address", { ascending: true })
          .limit(10);
        let pool = entries ?? [];
        if (pool.length) {
          const { data: flags } = await db
            .from("profiles")
            .select("address,banned")
            .in("address", pool.map((e) => e.address));
          const bannedSet = new Set((flags ?? []).filter((f) => f.banned).map((f) => f.address));
          pool = pool.filter((e) => !bannedSet.has(e.address));
        }
        winners = pool.slice(0, 3).map((e, idx) => ({
          address: e.address,
          amount: Number((PRIZE_USDM * CUP_SPLIT[idx]).toFixed(4)),
          tx: null,
        }));
        await db.from("cup_weeks").update({ winners }).eq("week", wk);
      }

      if (winners.length === 0) {
        await db
          .from("cup_weeks")
          .update({ status: "settled", settled_at: new Date().toISOString(), settle_error: null })
          .eq("week", wk);
        return NextResponse.json({ ok: true, settled: true, winners: [] });
      }

      const MEDALS = ["🥇 Cup champion", "🥈 Cup 2nd", "🥉 Cup 3rd"];
      const unpaid = winners.filter((w) => !w.tx);
      const owed = unpaid.reduce((s, w) => s + w.amount, 0);

      if (cupContract() && unpaid.length === winners.length) {
        // preferred: ONE relayer tx via the cup vault pays the whole podium;
        // the contract enforces once-per-week and emits WeekSettled.
        try {
          if (await cupWeekSettledOnChain(i)) {
            // paid on-chain in a previous attempt whose tx we lost — record that
            winners.forEach((w) => (w.tx = w.tx ?? "onchain"));
          } else {
            if ((await cupVaultBalance()) < parseUnits(owed.toString(), 18)) {
              await db.from("cup_weeks").update({ settle_error: "cup vault needs USDm funding" }).eq("week", wk);
              return NextResponse.json({ error: "Cup vault needs USDm funding" }, { status: 500 });
            }
            const tx = await settleCupOnChain(i, winners);
            winners.forEach((w) => (w.tx = tx));
            winners.forEach((w, idx) =>
              void notify([w.address], {
                title: `${MEDALS[idx]}!`,
                body: `${w.amount} USDm just landed in your wallet. 🎉`,
                url: "/tournaments",
              })
            );
          }
          await db.from("cup_weeks").update({ winners, settle_error: null }).eq("week", wk);
        } catch (e: any) {
          const settle_error = String(e?.shortMessage ?? e?.message ?? "settle failed").slice(0, 300);
          await db.from("cup_weeks").update({ winners, settle_error }).eq("week", wk);
          return NextResponse.json({ error: settle_error, winners }, { status: 500 });
        }
      } else {
        // fallback: direct treasury transfers (also finishes a legacy partial payout)
        if (!treasuryConfigured()) {
          await db.from("cup_weeks").update({ settle_error: "treasury not configured" }).eq("week", wk);
          return NextResponse.json({ error: "Treasury not configured" }, { status: 500 });
        }
        if (owed > 0) {
          const bal = await treasuryUsdmBalance();
          if (bal < parseUnits(owed.toString(), 18)) {
            await db.from("cup_weeks").update({ settle_error: "treasury needs USDm funding" }).eq("week", wk);
            return NextResponse.json({ error: "Treasury needs USDm funding" }, { status: 500 });
          }
        }
        // pay one by one, persisting each tx so a crash/retry never double-pays
        for (let idx = 0; idx < winners.length; idx++) {
          const w = winners[idx];
          if (w.tx) continue;
          try {
            w.tx = await payUsdm(w.address, w.amount);
            await db.from("cup_weeks").update({ winners, settle_error: null }).eq("week", wk);
            void notify([w.address], {
              title: `${MEDALS[idx]}!`,
              body: `${w.amount} USDm just landed in your wallet. 🎉`,
              url: "/tournaments",
            });
          } catch (e: any) {
            const settle_error = String(e?.shortMessage ?? e?.message ?? "pay failed").slice(0, 300);
            await db.from("cup_weeks").update({ winners, settle_error }).eq("week", wk);
            return NextResponse.json({ error: settle_error, winners }, { status: 500 });
          }
        }
      }

      await db
        .from("cup_weeks")
        .update({ status: "settled", settled_at: new Date().toISOString(), settle_error: null, winners })
        .eq("week", wk);
      return NextResponse.json({ ok: true, settled: true, winners });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
