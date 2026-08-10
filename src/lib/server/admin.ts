import { verifyToken } from "@/lib/server/profileToken";
import { OWNER_ADDRESS } from "@/lib/owner";

export { OWNER_ADDRESS };

/** True when the session token belongs to the owner wallet. */
export function isOwner(token?: string | null): boolean {
  if (!token) return false;
  return verifyToken(token)?.toLowerCase() === OWNER_ADDRESS.toLowerCase();
}
