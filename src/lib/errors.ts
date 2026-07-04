/**
 * Translate raw wallet/contract errors into words a player understands.
 * Nobody should ever read "execution reverted: NOT_OPEN" in the UI.
 * House style: plain English, no dashes.
 */
export function friendlyError(e: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw = String((e as any)?.shortMessage ?? (e as any)?.message ?? e ?? "");
  const s = raw.toLowerCase();

  // user actions
  if (s.includes("user rejected") || s.includes("user denied") || s.includes("rejected the request"))
    return "You declined the request in your wallet, so nothing was sent.";

  // our contract's revert reasons
  if (s.includes("not_open")) return "This room already started, or it was cancelled and refunded.";
  if (s.includes("expired")) return "The join window has closed, so this room can no longer be joined.";
  if (s.includes("already_in")) return "You have already joined this room.";
  if (s.includes("not_active")) return "This match is not live on the blockchain. It may have already been refunded.";
  if (s.includes("token_not_allowed")) return "This token is not enabled for staking yet.";
  if (s.includes("not_allowed")) return "You cannot do that yet. Only the creator can, or you may need to wait for the time window.";
  if (s.includes("too_early")) return "Too early. The refund window has not opened yet. Try again later.";
  if (s.includes("bad_winner") || s.includes("bad_ranking") || s.includes("dup_winner"))
    return "The result could not be recorded. Please retry the payout.";
  if (s.includes("zero_stake") || s.includes("bad_capacity")) return "Those room settings are invalid. Adjust the stake or player count.";
  if (s.includes("not_relayer") || s.includes("not_owner")) return "The server is not authorised for this. Please contact support.";

  // funds / gas
  if (s.includes("exceeds the balance") || s.includes("insufficient funds") || s.includes("gas * gas fee"))
    return "Not enough CELO for the small network fee. Add a little CELO to this wallet and try again.";
  if (s.includes("transfer amount exceeds") || s.includes("subtraction overflow") || s.includes("insufficient allowance"))
    return "Not enough balance to cover this stake.";

  // infra
  if (s.includes("estimategas") || s.includes("execution reverted"))
    return "The network rejected this. The room may be full, expired, or already settled. Refresh and try again.";
  if (s.includes("timeout") || s.includes("network") || s.includes("failed to fetch") || s.includes("fetch failed"))
    return "Network hiccup. Check your connection and try again.";
  if (s.includes("nonce")) return "Your wallet is out of sync. Wait a few seconds and try again.";

  // short, human-looking messages can pass through; raw hex/json must not
  if (raw && raw.length <= 90 && !raw.includes("0x") && !raw.includes("{")) return raw;
  return fallback;
}
