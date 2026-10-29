import { NextRequest, NextResponse } from "next/server";
import { formatUnits } from "viem";
import { supabaseAdmin } from "@/lib/supabase";
import { broadcast } from "@/lib/server/push";
import { decimalsForToken, symbolForToken } from "@/lib/tokens";
import { GAMES, STAKE_MAX } from "@/lib/games";
import { GAME_TYPE } from "@/lib/escrow";
import { readMatchOnChain } from "@/lib/server/settle";
import { limited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

const GAME_NAME: Record<string, string> = Object.fromEntries(GAMES.map((g) => [g.slug, g.name]));
const MIN_STAKE: Record<string, number> = Object.fromEntries(GAMES.map((g) => [g.slug, g.minStake]));

/**
 * Register a match the client just created on-chain. The server records it so it
 * can be authoritative over play. Idempotent on the match id.
 *
 * Everything stored is read back from the escrow: a room's creator, stake and
 * token are whatever the contract says, never what the request claims, so the
 * lobby can't advertise a stake the room doesn't actually have.
 *
 * Body: { id, game, chainId, creator }
 */
export async function POST(req: NextRequest) {
  try {
    // registering also broadcasts a push to every subscriber, keep it tight
    const rl = limited(req, "register", 10, 60_000);
    if (rl) return rl;
    const { id, game, chainId, creator } = await req.json();
    if (id === undefined || !game || !creator || GAME_TYPE[game] === undefined) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    // a room mined a moment ago can still read as empty on a lagging RPC node
    let oc = await readMatchOnChain(BigInt(id), Number(chainId));
    for (let i = 0; i < 3 && oc.status === 0; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      oc = await readMatchOnChain(BigInt(id), Number(chainId));
    }
    if (oc.status !== 1 && oc.status !== 2) {
      return NextResponse.json({ error: "No open room with that id on-chain" }, { status: 409 });
    }
    if (oc.creator !== String(creator).toLowerCase() || oc.gameType !== GAME_TYPE[game] || oc.capacity !== 2) {
      return NextResponse.json({ error: "That room doesn't match the escrow" }, { status: 409 });
    }
    const dec = decimalsForToken(oc.token);
    const human = Number(formatUnits(oc.stake, dec));
    if (human < (MIN_STAKE[game] ?? 0.5)) {
      return NextResponse.json({ error: "Below the minimum stake" }, { status: 400 });
    }
    if (human > STAKE_MAX) {
      return NextResponse.json({ error: "Above the maximum stake" }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: inserted, error } = await db
      .from("matches")
      .upsert(
        {
          id: Number(id),
          game,
          chain_id: Number(chainId),
          stake: oc.stake.toString(),
          creator: oc.creator,
          status: "open",
          token: oc.token,
          decimals: dec,
        },
        { onConflict: "id", ignoreDuplicates: true }
      )
      .select("id");
    if (error) throw error;

    // A brand-new open challenge: tell every subscribed player except the
    // creator, so an empty lobby can still find an opponent. Fire and forget.
    if (inserted?.length && oc.status === 1) {
      const symbol = symbolForToken(oc.token);
      const name = GAME_NAME[game] ?? game;
      void broadcast(
        {
          title: `⚔️ ${human} ${symbol} ${name} challenge`,
          body: "Someone just opened a 1v1 for money. First to join plays for the pot.",
          url: `/play/${game}?room=${Number(id)}&stake=${human}&token=${oc.token}`,
          tag: "open-challenge", // newer challenges replace older pings
        },
        oc.creator
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
