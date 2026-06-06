"use client";

/** Sharing + referral helpers. The referral code is simply the inviter's wallet. */

const REF_KEY = "gambit:ref";

function origin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://gambit-rose.vercel.app";
}

/** A shareable invite link carrying the inviter's referral code. */
export function inviteUrl(address?: string | null): string {
  const base = origin();
  return address ? `${base}/?ref=${address.toLowerCase()}` : base;
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

/** Read ?ref=<address> from the URL once and remember it (until they sign up). */
export function captureRef(): void {
  if (typeof window === "undefined") return;
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^0x[0-9a-fA-F]{40}$/.test(ref) && !localStorage.getItem(REF_KEY)) {
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
