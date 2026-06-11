/**
 * Translate raw wallet/contract errors into words a player understands.
 * Nobody should ever read "execution reverted: NOT_OPEN" in the UI.
 */
export function friendlyError(e: unknown, fallback = "Something went wrong — please try again."): string {
  const raw = String((e as any)?.shortMessage ?? (e as any)?.message ?? e ?? "");
  const s = raw.toLowerCase();

  // user actions
  if (s.includes("user rejected") || s.includes("user denied") || s.includes("rejected the request"))
    return "You declined the request in your wallet — nothing was sent.";

  // our contract's revert reasons
  if (s.includes("not_open")) return "This room already started or was already cancelled and refunded.";
  if (s.includes("expired")) return "The join window has closed — this room can't be joined anymore.";
  if (s.includes("already_in")) return "You've already joined this room.";
  if (s.includes("not_active")) return "This match isn't live on-chain — it may have already been refunded.";
  if (s.includes("token_not_allowed")) return "This token isn't enabled for staking yet.";
  if (s.includes("not_allowed")) return "You can't do that yet — only the creator can, or you need to wait for the time window.";
  if (s.includes("too_early")) return "Too early — the refund window hasn't opened yet. Try again later.";
  if (s.includes("bad_winner") || s.includes("bad_ranking") || s.includes("dup_winner"))
    return "The result couldn't be recorded — please retry the payout.";
  if (s.includes("zero_stake") || s.includes("bad_capacity")) return "Invalid room settings — adjust the stake or player count.";
  if (s.includes("not_relayer") || s.includes("not_owner")) return "The server isn't authorised for this — contact support.";

  // funds / gas
  if (s.includes("exceeds the balance") || s.includes("insufficient funds") || s.includes("gas * gas fee"))
    return "Not enough CELO to pay the small network fee — add a little CELO to this wallet and retry.";
  if (s.includes("transfer amount exceeds") || s.includes("subtraction overflow") || s.includes("insufficient allowance"))
    return "Not enough balance to cover this stake.";

  // infra
  if (s.includes("estimategas") || s.includes("execution reverted"))
    return "The network rejected this — the room may be full, expired, or already settled. Refresh and try again.";
  if (s.includes("timeout") || s.includes("network") || s.includes("failed to fetch") || s.includes("fetch failed"))
    return "Network hiccup — check your connection and try again.";
  if (s.includes("nonce")) return "Your wallet is out of sync — wait a few seconds and retry.";

  // short, human-looking messages can pass through; raw hex/json must not
  if (raw && raw.length <= 90 && !raw.includes("0x") && !raw.includes("{")) return raw;
  return fallback;
}
