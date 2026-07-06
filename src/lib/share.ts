"use client";

/** Sharing + referral helpers. The referral code is simply the inviter's wallet. */

const REF_KEY = "gambit:ref";

function origin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://gambit-rose.vercel.app";
}

/** A shareable invite link carrying the inviter's referral code. Prefers a
 *  short ref code (no wallet details in the link); a wallet address still
 *  works for older links. */
export function inviteUrl(ref?: string | null): string {
  const base = origin();
  return ref ? `${base}/?ref=${ref.toLowerCase()}` : base;
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
