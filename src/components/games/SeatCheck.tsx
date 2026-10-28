"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useSignMessage } from "wagmi";
import { hasToken, signIn } from "@/lib/profile";
import { claimSession } from "@/lib/stakeProof";
import { supabase } from "@/lib/supabase";
import { buttonClass } from "@/components/ui/Button";

// unknown counts as live: better to ask once too often than to strand a seat
async function stillPlaying(matchId: bigint) {
  if (!supabase) return true;
  const { data } = await supabase.from("matches").select("status").eq("id", Number(matchId)).maybeSingle();
  return !data || data.status === "open" || data.status === "active";
}

// A money board needs a session for this seat. The stake normally brings one;
// only a phone with no stake on record (a reinstall, another device) is asked
// to confirm with a signature, and only so the player doesn't lose their seat.
// A match that is already over needs nothing from this phone.
export function SeatCheck({ you, matchId }: { you: `0x${string}`; matchId: bigint }) {
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
    (async () => {
      if (!(await stillPlaying(matchId))) return live && setState("ok");
      const ok = await claimSession(you);
      if (live) setState(ok ? "ok" : "needed");
    })();
    return () => {
      live = false;
    };
  }, [you, matchId]);

  // a claim still running behind the room may land after this one gave up,
  // and the match can end while the sheet is up
  useEffect(() => {
    if (state !== "needed") return;
    const t = setInterval(async () => {
      if (hasToken(you) || !(await stillPlaying(matchId))) setState("ok");
    }, 3000);
    return () => clearInterval(t);
  }, [state, you, matchId]);

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
