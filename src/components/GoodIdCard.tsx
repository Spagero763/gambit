"use client";

import { BadgeCheck, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useGoodId } from "@/hooks/useGoodId";

/**
 * Profile card for GoodDollar identity. Shows a "Verified Human" badge when the
 * wallet is whitelisted, or a CTA to run Face Verification. This is what powers
 * Sybil-resistant free tournaments (one real human, one entry).
 */
export function GoodIdCard() {
  const { verified, checking, verify, ready } = useGoodId();
  const [busy, setBusy] = useState(false);

  // still figuring out status — keep it quiet
  if (!ready || verified === null) {
    return null;
  }

  if (verified) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-teal/30 bg-teal/[0.06] p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal/15 text-teal">
          <BadgeCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Verified Human · GoodDollar</p>
          <p className="text-[12px] text-ink-dim">You can enter free prize tournaments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-line bg-void-700 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-void-600 text-violet">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">Verify you&apos;re a real human</p>
        <p className="mt-0.5 text-[12px] leading-snug text-ink-dim">
          A quick GoodDollar face check unlocks free prize tournaments — one entry per person, no bots, no farming.
        </p>
        <button
          onClick={async () => {
            setBusy(true);
            try {
              await verify();
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy || checking}
          className="btn-primary mt-3 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] shadow-glow disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          Verify with GoodDollar
        </button>
      </div>
    </div>
  );
}
