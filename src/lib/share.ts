"use client";

/** Sharing + referral helpers. Invite links carry a short random code, never a
 *  wallet address — a link gets pasted into group chats, and a wallet in it
 *  hands strangers the inviter's balance and full match history. */

const REF_KEY = "gambit:ref";

function origin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://gambit-rose.vercel.app";
}

/** A shareable invite link carrying the inviter's short referral code.
 *
 *  A wallet address is never accepted here. Links created before short codes
 *  existed still resolve on the way IN (see the API), but nothing new is minted
 *  with an address in it. Without a code you get the plain site link, which
 *  still works, it just earns nobody a bonus. */
export function inviteUrl(ref?: string | null): string {
  const base = origin();
  const code = ref?.trim().toLowerCase();
  if (!code || /^0x[0-9a-f]{40}$/.test(code)) return base;
  return `${base}/?ref=${code}`;
}

/** Native share sheet when available, else copy to clipboard. Returns "shared" | "copied" | "failed". */
export async function shareOrCopy(data: { title?: string; text?: string; url: string }): Promise<"shared" | "copied" | "failed"> {
  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      await (navigator as any).share(data);
      return "shared";
    }
  } catch {
    // user cancelled or share failed — fall through to copy
  }
  try {
    await navigator.clipboard.writeText(`${data.text ? data.text + " " : ""}${data.url}`);
    return "copied";
  } catch {
    return "failed";
  }
}

/** Read ?ref=<code or address> from the URL once and remember it (until they sign up). */
export function captureRef(): void {
  if (typeof window === "undefined") return;
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    const valid = ref && (/^0x[0-9a-fA-F]{40}$/.test(ref) || /^[a-z0-9]{5,12}$/i.test(ref));
    if (valid && !localStorage.getItem(REF_KEY)) {
      localStorage.setItem(REF_KEY, ref.toLowerCase());
    }
  } catch {
    /* ignore */
  }
}

export function getRef(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return localStorage.getItem(REF_KEY) || undefined;
  } catch {
    return undefined;
  }
}
