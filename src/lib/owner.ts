/**
 * The contract owner wallet — the only identity allowed into the admin panel.
 *
 * Public on-chain (ArcadeEscrow.owner()), so this is not a secret; the gate is a
 * signed session token, not a password. It lives here rather than in
 * lib/server/admin.ts because the client panel needs it too, and that file pulls
 * in server-only code.
 *
 * Keep this equal to `owner()` on the escrow. When ownership is transferred the
 * chain changes instantly and this does not, which locks you out of /admin until
 * you deploy — so rotate both together.
 */
export const OWNER_ADDRESS = "0x0a39abc474d355ff0e7174e28745f5535f9ba28e";
