import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isOwner } from "@/lib/server/admin";
import { settleOnChain, settleRanking, readMatchOnChain, relayerConfigured } from "@/lib/server/settle";
import { rankTop3, TPlayer } from "@/lib/server/tournament";
import { weekIndex, weekKey } from "@/lib/cup";

export const runtime = "nodejs";

/**
 * Owner-only recovery actions. Body: { token, action, id, chainId? }
 *   settleMatch      pay the recorded winner (chainId optional override)
 *   refundMatch      refund both players (winner = none)
 *   settleTournament rank + pay top three
 *   removeCupEntry   kick a wallet out of this week's cup (id = address)
 *   banWallet        block a wallet from prizes, claims and referrals (id = address)
 *   unbanWallet      lift the block (id = address)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, action, id, chainId } = body;
    if (!isOwner(token)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!action || id === undefined) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const db = supabaseAdmin();

    // moderation actions (no relayer needed)
    if (action === "removeCupEntry" || action === "banWallet" || action === "unbanWallet") {
      const addr = String(id).toLowerCase();
      if (!/^0x[0-9a-f]{40}$/.test(addr)) {
        return NextResponse.json({ error: "id must be a wallet address" }, { status: 400 });
      }
      if (action === "removeCupEntry") {
        await db.from("cup_entries").delete().eq("week", weekKey(weekIndex())).eq("address", addr);
        return NextResponse.json({ ok: true, removed: addr });
      }
      const banned = action === "banWallet";
      const { data: updated } = await db.from("profiles").update({ banned }).eq("address", addr).select("address");
      if (!updated?.length) {
        // no profile yet — create a minimal row so the ban sticks
        await db.from("profiles").insert({ address: addr, name: "", avatar: "teal", banned });
      }
      if (banned) {
        // a banned wallet also loses its seat in the current cup
        await db.from("cup_entries").delete().eq("week", weekKey(weekIndex())).eq("address", addr);
      }
      return NextResponse.json({ ok: true, banned, address: addr });
    }

    if (!relayerConfigured()) return NextResponse.json({ error: "Relayer not configured" }, { status: 500 });

    if (action === "settleMatch" || action === "refundMatch") {
      const { data: m } = await db.from("matches").select("*").eq("id", Number(id)).maybeSingle();
      if (!m) return NextResponse.json({ error: "Match not found" }, { status: 404 });
      if (m.status === "settled") return NextResponse.json({ ok: true, settled: true, settleTx: m.settle_tx });

      let settleChainId = Number(m.chain_id);
      if (chainId !== undefined && chainId !== null && Number(chainId) !== settleChainId) {
        // verify the override chain holds the SAME match before paying
        const oc = await readMatchOnChain(BigInt(id), Number(chainId));
        if (oc.status !== 2 || oc.creator !== String(m.creator).toLowerCase() || oc.stake !== BigInt(m.stake)) {
          return NextResponse.json({ error: "Override chain does not hold this exact match" }, { status: 409 });
        }
        settleChainId = Number(chainId);
      }

      const winner = action === "refundMatch" ? null : m.winner ?? null;
      try {
        const tx = await settleOnChain(BigInt(id), winner, settleChainId);
        await db.from("matches").update({ status: "settled", settle_tx: tx, winner, chain_id: settleChainId, settle_error: null }).eq("id", Number(id));
        return NextResponse.json({ ok: true, settled: true, refunded: !winner, settleTx: tx, chainId: settleChainId });
      } catch (e: any) {
        const settle_error = String(e?.shortMessage ?? e?.message ?? "settle failed").slice(0, 300);
        await db.from("matches").update({ settle_error }).eq("id", Number(id));
        return NextResponse.json({ ok: false, error: settle_error });
      }
    }

    if (action === "settleTournament") {
      const { data: t } = await db.from("tournaments").select("*").eq("id", Number(id)).maybeSingle();
      if (!t) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
      if (t.status === "settled") return NextResponse.json({ ok: true, settled: true, settleTx: t.settle_tx });
      const { data: players } = await db.from("tournament_players").select("address,score").eq("tournament_id", Number(id));
      const list = (players as TPlayer[]) ?? [];
      if (list.length < 3) return NextResponse.json({ error: "Need at least 3 players to settle" }, { status: 409 });
      const ranking = rankTop3(list);
      await db.from("tournaments").update({ status: "settling", winners: ranking, settle_error: null }).eq("id", Number(id));
      try {
        const tx = await settleRanking(BigInt(id), ranking, Number(t.chain_id));
        await db.from("tournaments").update({ status: "settled", settle_tx: tx, settle_error: null }).eq("id", Number(id));
        return NextResponse.json({ ok: true, settled: true, settleTx: tx, ranking });
      } catch (e: any) {
        const settle_error = String(e?.shortMessage ?? e?.message ?? "settle failed").slice(0, 300);
        await db.from("tournaments").update({ settle_error }).eq("id", Number(id));
        return NextResponse.json({ ok: false, error: settle_error });
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
