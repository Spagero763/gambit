import { NextRequest, NextResponse } from "next/server";
import { keccak256, recoverMessageAddress } from "viem";
import { createToken } from "@/lib/server/profileToken";
import { readTx } from "@/lib/server/settle";
import { ESCROW_ADDRESS } from "@/lib/escrow";
import { limited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

const HASH = /^0x[0-9a-f]{64}$/;

/**
 * Sign-in: the wallet proves it is yours and gets a session token, which moves,
 * chat and resign require so an opponent can't play your seat.
 *
 * Two proofs are accepted:
 *  - a stake: { address, tx, chainId, secret }. The stake transaction was sent
 *    by this address to the escrow and ends its calldata with keccak256(secret).
 *    Only the phone that built it knows the secret. This is the MiniPay path,
 *    where apps may not ask for a signature.
 *  - a signature: { address, message, signature }, for web wallets and admin.
 */
export async function POST(req: NextRequest) {
  try {
    const rl = limited(req, "auth", 10, 30_000);
    if (rl) return rl;
    const { address, message, signature, tx, chainId, secret } = await req.json();
    if (!address) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const addr = String(address).toLowerCase();

    if (tx || secret) {
      const hash = String(tx ?? "").toLowerCase();
      const key = String(secret ?? "").toLowerCase();
      const escrow = ESCROW_ADDRESS[Number(chainId)]?.toLowerCase();
      if (!HASH.test(hash) || !HASH.test(key) || !escrow) {
        return NextResponse.json({ error: "Bad request" }, { status: 400 });
      }
      let t: Awaited<ReturnType<typeof readTx>>;
      try {
        t = await readTx(hash as `0x${string}`, Number(chainId));
      } catch {
        return NextResponse.json({ error: "That stake isn't on the network yet" }, { status: 409 });
      }
      const mark = keccak256(key as `0x${string}`).slice(2);
      if (!t.ok || t.from !== addr || t.to !== escrow || !t.input.endsWith(mark)) {
        return NextResponse.json({ error: "That stake doesn't prove this wallet" }, { status: 401 });
      }
      return NextResponse.json({ token: createToken(addr) });
    }

    if (!message || !signature) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
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
