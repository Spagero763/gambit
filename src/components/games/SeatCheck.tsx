"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useSignMessage } from "wagmi";
import { hasToken, signIn } from "@/lib/profile";
import { claimSession } from "@/lib/stakeProof";
import { buttonClass } from "@/components/ui/Button";

// A money board needs a session for this seat. The stake normally brings one;
// only a phone with no stake on record (a reinstall, another device) is asked
// to confirm with a signature, and only so the player doesn't lose their seat.
export function SeatCheck({ you }: { you: `0x${string}` }) {
  const [state, setState] = useState<"checking" | "ok" | "needed">("checking");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    let live = true;
    if (hasToken(you)) {
      setState("ok");
      return;
    }
    claimSession(you).then((ok) => live && setState(ok ? "ok" : "needed"));
    return () => {
      live = false;
    };
  }, [you]);

  // a claim still running behind the room may land after this one gave up
  useEffect(() => {
    if (state !== "needed") return;
    const t = setInterval(() => hasToken(you) && setState("ok"), 2000);
    return () => clearInterval(t);
  }, [state, you]);

  if (state !== "needed") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[85] px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
      <div role="alert" className="panel mx-auto max-w-md rounded-[24px] p-5">
        <p className="flex items-center gap-2 text-[16px] font-bold text-ink">
          <ShieldCheck className="h-5 w-5 text-teal" /> Confirm this seat is yours
        </p>
        <p className="mt-1.5 text-[16px] leading-snug text-ink-dim">
          This phone doesn&apos;t have your stake on record, so moves can&apos;t be sent from it yet. One free confirmation fixes that. No money moves.
        </p>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              await signIn(you, (a) => signMessageAsync({ message: a.message }));
              setState("ok");
            } catch {
              setErr("Not confirmed. Tap to try again.");
            } finally {
              setBusy(false);
            }
          }}
          className={buttonClass("primary", "lg", "mt-4 w-full")}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirm
        </button>
        {err && <p role="alert" className="mt-2 text-center text-[14px] text-rose">{err}</p>}
      </div>
    </div>
  );
}
