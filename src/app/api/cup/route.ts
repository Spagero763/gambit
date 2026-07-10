import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/server/profileToken";
import { goodIdRoot } from "@/lib/server/goodid";
import { treasuryConfigured, treasuryUsdmBalance, payUsdm } from "@/lib/server/treasury";
import { cupContract, cupWeekSettledOnChain, cupVaultBalance, settleCupOnChain } from "@/lib/server/cupChain";
import { cupShareAmount, cupSharePaid, payCupShare } from "@/lib/server/cupShare";
import { weekIndex, weekKey, weekSeed, weekStart, weekEnd, CUP_SPLIT } from "@/lib/cup";
import { notify } from "@/lib/server/push";
import { limited } from "@/lib/server/rateLimit";
import { parseUnits } from "viem";

export const runtime = "nodejs";

/**
 * The Weekly Cup: FREE entry, GoodID-verified humans only, everyone plays the
 * same Block Blitz board for the week, top three split a USDm prize from the
 * treasury (50/30/20). Sybil resistance is server-enforced: entry requires a
 * whitelisted GoodDollar identity, and the UNIQUE(week, root) constraint means
 * a human with five linked wallets still gets exactly one seat.
 */
const PRIZE_USDM = Number(process.env.CUP_PRIZE_USDM ?? "10");
// The cup shows as Coming Soon until opening day — set CUP_OPEN=1 in Vercel to
// open entries (no redeploy needed). Settlement of past weeks stays available.
const CUP_OPEN = process.env.CUP_OPEN === "1";

const clampScore = (v: unknown) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 10_000_000) : 0;
};

interface Winner {
  address: string;
  amount: number;
  tx: string | null;
}

/** GET ?address= -> current week state + leaderboard + last week's result. */
export async function GET(req: NextRequest) {
  try {
    const db = supabaseAdmin();
    const me = req.nextUrl.searchParams.get("address")?.toLowerCase() ?? null;
    const i = weekIndex();
    const wk = weekKey(i);

    const { data: entries } = await db
      .from("cup_entries")
      .select("address,score")
      .eq("week", wk)
      .order("score", { ascending: false })
      .order("address", { ascending: true })
      .limit(50);
    const board = entries ?? [];
    const mine = me ? board.find((e) => e.address === me) ?? null : null;

    const { data: last } = await db
      .from("cup_weeks")
      .select("week,status,winners")
      .eq("week", weekKey(i - 1))
      .maybeSingle();

    // resolve winner display names so the podium shows people, not raw 0x…
    if (last?.winners?.length) {
      const addrs = (last.winners as Winner[]).map((w) => w.address);
      const { data: profs } = await db.from("profiles").select("address,name").in("address", addrs);
      const nameOf = Object.fromEntries((profs ?? []).map((p) => [p.address, p.name]));
      last.winners = (last.winners as Winner[]).map((w) => ({ ...w, name: nameOf[w.address] || null }));
    }

    return NextResponse.json({
      week: wk,
      open: CUP_OPEN,
      seed: weekSeed(i),
      startsAt: weekStart(i),
      endsAt: weekEnd(i),
      prize: PRIZE_USDM,
      split: CUP_SPLIT,
      entries: board.slice(0, 20),
      count: board.length,
      me: mine,
      joined: !!mine,
      last: last ?? null,
      shareBonus: cupShareAmount(), // 0 = the share-your-win bonus is off
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = limited(req, "cup", 20, 60_000);
    if (rl) return rl;
    const body = await req.json();
    const action = String(body.action ?? "");
    const db = supabaseAdmin();

    if (action === "join") {
      if (!CUP_OPEN) {
        return NextResponse.json({ error: "The Weekly Cup opens soon — watch this space" }, { status: 403 });
      }
      const addr = String(body.address ?? "").toLowerCase();
      if (!addr || verifyToken(String(body.auth)) !== addr) {
        return NextResponse.json({ error: "Sign in to enter the cup" }, { status: 401 });
      }
      // blocked wallets don't get into prize events
      const { data: bp } = await db.from("profiles").select("banned").eq("address", addr).maybeSingle();
      if (bp?.banned) {
        return NextResponse.json({ error: "This account is blocked from prize events" }, { status: 403 });
      }
      // humans only — read GoodDollar's Identity contract server-side
      let root: string | null = null;
      try {
        root = await goodIdRoot(addr);
      } catch {
        return NextResponse.json({ error: "Identity check failed — try again" }, { status: 502 });
      }
      if (!root) {
        return NextResponse.json(
          { error: "Verify you're a real human on your Profile first (GoodDollar face check)" },
          { status: 403 }
        );
      }
      const wk = weekKey(weekIndex());
      const { error } = await db.from("cup_entries").insert({ week: wk, address: addr, root });
      if (error) {
        // same wallet twice → fine (idempotent). Same HUMAN via another wallet → block.
        const dup = String(error.message ?? "");
        const { data: mineRow } = await db
          .from("cup_entries")
          .select("address")
          .eq("week", wk)
          .eq("address", addr)
          .maybeSingle();
        if (mineRow) return NextResponse.json({ ok: true, joined: true });
        if (dup.includes("cup_entries_week_root") || dup.toLowerCase().includes("duplicate")) {
          return NextResponse.json(
            { error: "Your verified identity already entered this week with another wallet" },
            { status: 409 }
          );
        }
        throw error;
      }
      return NextResponse.json({ ok: true, joined: true });
    }

    if (action === "score") {
      const addr = String(body.address ?? "").toLowerCase();
      if (!addr || verifyToken(String(body.auth)) !== addr) {
        return NextResponse.json({ error: "Sign in to submit" }, { status: 401 });
      }
      const wk = weekKey(weekIndex());
      const { data: mine } = await db
        .from("cup_entries")
        .select("score")
        .eq("week", wk)
        .eq("address", addr)
        .maybeSingle();
      if (!mine) return NextResponse.json({ error: "Join the cup first" }, { status: 403 });
      const best = Math.max(clampScore(body.score), mine.score ?? 0);
      await db
        .from("cup_entries")
        .update({ score: best, scored_at: new Date().toISOString() })
        .eq("week", wk)
        .eq("address", addr);
      return NextResponse.json({ ok: true, best });
    }

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

      const MEDALS = ["🥇 Weekly Cup champion", "🥈 Weekly Cup 2nd", "🥉 Weekly Cup 3rd"];
      const unpaid = winners.filter((w) => !w.tx);
      const owed = unpaid.reduce((s, w) => s + w.amount, 0);

      if (cupContract() && unpaid.length === winners.length) {
        // preferred: ONE relayer tx via the WeeklyCup vault pays the whole
        // podium; the contract enforces once-per-week and emits WeekSettled.
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

    if (action === "share") {
      // A top-3 winner who posted their result on X claims a bonus. The prize
      // was already paid at settle; this is a carrot on top, never a gate.
      const rl2 = limited(req, "cupshare", 5, 60_000);
      if (rl2) return rl2;
      const addr = verifyToken(String(body.token ?? ""));
      if (!addr) return NextResponse.json({ error: "Sign in to claim" }, { status: 401 });

      const amt = cupShareAmount();
      if (!amt) return NextResponse.json({ error: "The share bonus isn't active right now" }, { status: 409 });

      const url = String(body.tweetUrl ?? "").trim();
      if (!/^https?:\/\/(x\.com|twitter\.com|mobile\.x\.com)\/[^/]+\/status\/\d+/i.test(url)) {
        return NextResponse.json({ error: "Paste the link to your X post" }, { status: 400 });
      }

      // must be a top-3 winner of the most recent SETTLED week
      const lastWk = weekKey(weekIndex() - 1);
      const { data: row } = await db.from("cup_weeks").select("week,status,winners").eq("week", lastWk).maybeSingle();
      if (!row || row.status !== "settled") {
        return NextResponse.json({ error: "No settled cup to claim for yet" }, { status: 409 });
      }
      const winners = (row.winners as (Winner & { shareTx?: string; tweet?: string })[]) ?? [];
      const meWinner = winners.find((w) => w.address.toLowerCase() === addr);
      if (!meWinner) return NextResponse.json({ error: "Only this week's top 3 can claim the share bonus" }, { status: 403 });
      if (meWinner.shareTx) return NextResponse.json({ ok: true, already: true, tx: meWinner.shareTx, amount: amt });

      // chain is the source of truth for once-per-week
      if (await cupSharePaid(lastWk, addr)) {
        meWinner.shareTx = "onchain";
        meWinner.tweet = url;
        await db.from("cup_weeks").update({ winners }).eq("week", lastWk);
        return NextResponse.json({ ok: true, already: true, amount: amt });
      }
      try {
        const tx = await payCupShare(lastWk, addr);
        meWinner.shareTx = tx;
        meWinner.tweet = url;
        await db.from("cup_weeks").update({ winners }).eq("week", lastWk);
        void notify([addr], {
          title: "Share bonus paid 🎉",
          body: `${amt} USDm for sharing your Weekly Cup win just landed in your wallet.`,
          url: "/tournaments",
        });
        return NextResponse.json({ ok: true, amount: amt, tx });
      } catch {
        return NextResponse.json({ error: "Couldn't send the bonus right now. Try again." }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
