import { NextRequest, NextResponse } from "next/server";
import { formatUnits } from "viem";
import { supabaseAdmin } from "@/lib/supabase";
import { broadcast } from "@/lib/server/push";
import { symbolForToken } from "@/lib/tokens";
import { GAMES } from "@/lib/games";
import { limited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

const GAME_NAME: Record<string, string> = Object.fromEntries(GAMES.map((g) => [g.slug, g.name]));

/**
 * Register a match the client just created on-chain. The server records it so it
 * can be authoritative over play. Idempotent on the match id.
 *
 * Body: { id, game, chainId, stake, creator }
 */
export async function POST(req: NextRequest) {
  try {
    // registering also broadcasts a push to every subscriber — keep it tight
    const rl = limited(req, "register", 10, 60_000);
    if (rl) return rl;
    const { id, game, chainId, stake, creator, token, decimals } = await req.json();
    if (id === undefined || !game || !creator) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    const db = supabaseAdmin();
    const dec = Number.isFinite(Number(decimals)) ? Number(decimals) : 18;
    const { data: inserted, error } = await db
      .from("matches")
      .upsert(
        {
          id: Number(id),
          game,
          chain_id: Number(chainId),
          stake: String(stake),
          creator: String(creator).toLowerCase(),
          status: "open",
          token: token ? String(token).toLowerCase() : null,
          decimals: dec,
        },
        { onConflict: "id", ignoreDuplicates: true }
      )
      .select("id");
    if (error) throw error;

    // A brand-new open challenge: tell every subscribed player except the
    // creator, so an empty lobby can still find an opponent. Fire and forget.
    if (inserted?.length) {
      const human = Number(formatUnits(BigInt(String(stake ?? "0")), dec));
      const symbol = symbolForToken(token ? String(token) : null);
      const name = GAME_NAME[game] ?? game;
      void broadcast(
        {
          title: `⚔️ ${human} ${symbol} ${name} challenge`,
          body: "Someone just opened a staked room. First to join plays for the pot.",
          url: `/play/${game}?room=${Number(id)}&stake=${human}${token ? `&token=${token}` : ""}`,
          tag: "open-challenge", // newer challenges replace older pings
        },
        String(creator)
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
