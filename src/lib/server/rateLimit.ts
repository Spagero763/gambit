import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight fixed-window rate limiter. Best-effort: on serverless it's
 * per-instance (not globally shared), so it blunts floods/abuse from a single
 * warm instance rather than guaranteeing a global cap. For a hard global limit,
 * swap the Map for Upstash Redis / Vercel KV.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    // opportunistic cleanup so the map can't grow unbounded
    if (buckets.size > 5000) {
      buckets.forEach((v, k) => {
        if (now > v.reset) buckets.delete(k);
      });
    }
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
}

/** Returns a 429 response if the caller is over the limit, else null. */
export function limited(req: NextRequest, name: string, limit = 30, windowMs = 10_000): NextResponse | null {
  if (!rateLimit(`${name}:${clientIp(req)}`, limit, windowMs)) {
    return NextResponse.json({ error: "Too many requests — slow down." }, { status: 429 });
  }
  return null;
}
