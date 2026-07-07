"use client";

import { BadgeCheck, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAccount } from "wagmi";
import { useGoodId } from "@/hooks/useGoodId";

/**
 * Profile card for GoodDollar identity. Always visible for signed-in users:
 * a "Verified Human" badge when whitelisted, otherwise the verification CTA.
 * This powers Sybil-resistant free tournaments (one real human, one entry)
 * and the free-play referral path.
 */
export function GoodIdCard() {
  const { address } = useAccount();
  const { verified, checking, verify } = useGoodId();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!address) return null;

  if (verified) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-teal/30 bg-teal/[0.06] p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal/15 text-teal">
          <BadgeCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Verified Human · GoodDollar</p>
          <p className="text-[12px] text-ink-dim">You can enter free prize tournaments and activate referral bonuses.</p>
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
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-ink">Verify you&apos;re a real human</p>
          <span className="rounded-full bg-void-600 px-2 py-0.5 text-[10px] font-semibold text-ink-faint">
            {checking ? "checking" : "Optional"}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] leading-snug text-ink-dim">
          You can play and stake without this. A quick GoodDollar face check unlocks the{" "}
          <span className="text-ink">free prize tournaments</span>, one entry per person, no bots.
        </p>
        <button
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              await verify();
            } catch (e: any) {
              setErr(e?.message ?? "Could not start verification. Try again.");
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="btn-primary mt-3 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] shadow-glow disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          Verify with GoodDollar
        </button>
        {err && <p className="mt-2 text-[12px] text-rose">{err}</p>}
      </div>
    </div>
  );
}
