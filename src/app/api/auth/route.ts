import { NextRequest, NextResponse } from "next/server";
import { recoverMessageAddress } from "viem";
import { createToken } from "@/lib/server/profileToken";

export const runtime = "nodejs";

/**
 * Sign-in: a wallet proves ownership with a signature and receives a session
 * token. The token is then required to submit moves, so an opponent can't play
 * on your behalf. No DB write — pure auth.
 *
 * Body: { address, message, signature } -> { token }
 */
export async function POST(req: NextRequest) {
  try {
    const { address, message, signature } = await req.json();
    if (!address || !message || !signature) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    const addr = String(address).toLowerCase();
    if (message !== `Sign in to Gambit\nAddress: ${addr}`) {
      return NextResponse.json({ error: "Unexpected message" }, { status: 400 });
    }
    const recovered = await recoverMessageAddress({ message, signature });
    if (recovered.toLowerCase() !== addr) {
      return NextResponse.json({ error: "Bad signature" }, { status: 401 });
    }
    return NextResponse.json({ token: createToken(addr) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
