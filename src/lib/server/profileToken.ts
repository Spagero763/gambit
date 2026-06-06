import crypto from "crypto";

/**
 * Lightweight session token so a wallet can sync its progression after a single
 * sign-in, without signing again on every update. HMAC-signed (address + expiry)
 * with a server-only secret. Not a security boundary for funds — it only gates
 * writes to that wallet's own cosmetic profile row.
 */
const SECRET =
  process.env.PROFILE_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "gambit-dev-secret";
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function createToken(address: string): string {
  const payload = `${address.toLowerCase()}.${Date.now() + TTL_MS}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

/** Returns the address if the token is valid and unexpired, else null. */
export function verifyToken(token: string): string | null {
  try {
    const [p, sig] = token.split(".");
    if (!p || !sig) return null;
    const payload = Buffer.from(p, "base64url").toString();
    const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const [addr, exp] = payload.split(".");
    if (!addr || Date.now() > Number(exp)) return null;
    return addr;
  } catch {
    return null;
  }
}
