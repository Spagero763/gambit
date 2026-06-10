import { verifyToken } from "@/lib/server/profileToken";

// The contract owner wallet — the only identity allowed into the admin panel.
// Public on-chain (ArcadeEscrow.owner()); gating is by a signed session token,
// so no shared password exists to leak.
export const OWNER_ADDRESS = "0x32a3596c25a98950e850e3531a0aa87f1506e5d7";

/** True when the session token belongs to the owner wallet. */
export function isOwner(token?: string | null): boolean {
  if (!token) return false;
  return verifyToken(token)?.toLowerCase() === OWNER_ADDRESS.toLowerCase();
}
