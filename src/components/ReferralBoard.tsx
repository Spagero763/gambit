"use client";

import { useEffect, useState } from "react";
import { Users, CheckCircle2, Clock } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";

interface Board {
  invited: number;
  activated: number;
  earned: number;
  perFriend: number;
  friends: { name: string | null; played: number; paid: boolean }[];
}

/**
 * The inviter's scoreboard: how many friends joined with your link, who has
 * activated (bonus paid on-chain), and what you've earned so far. Lives right
 * under the invite card so sharing and results sit together.
 */
export function ReferralBoard({ address }: { address: string }) {
  const [b, setB] = useState<Board | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/referrals?address=${address}`)
      .then((r) => r.json())
      .then((d) => {
        if (live && !d.error) setB(d);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [address]);

  // nothing to show until someone actually joined with the link
  if (!b || b.invited === 0) return null;

  return (
    <div className="mt-3 rounded-2xl border border-line bg-void-700 p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Users className="h-4 w-4 text-teal" /> Your referrals
        </p>
        <p className="text-[12px] text-ink-dim">
          earned <AnimatedNumber value={b.earned} decimals={2} className="font-semibold text-teal" /> <span className="text-teal">USDm</span>
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl border border-line bg-void-800 px-3 py-2.5">
          <p className="nums text-lg font-bold text-ink">{b.invited}</p>
          <p className="text-[10px] text-ink-faint">joined with your link</p>
        </div>
        <div className="rounded-xl border border-line bg-void-800 px-3 py-2.5">
          <p className="nums text-lg font-bold text-teal">{b.activated}</p>
          <p className="text-[10px] text-ink-faint">activated · paid you</p>
        </div>
      </div>

      {b.friends.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {b.friends.slice(0, 8).map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-void-800/60 px-3 py-2 text-[13px]">
              <span className="truncate text-ink-dim">{f.name || `Friend ${i + 1}`}</span>
              <span className="ml-auto flex items-center gap-1 text-[11px]">
                {f.paid ? (
                  <span className="flex items-center gap-1 font-semibold text-teal">
                    <CheckCircle2 className="h-3.5 w-3.5" /> paid +{b.perFriend} USDm
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-ink-faint">
                    <Clock className="h-3.5 w-3.5" /> {f.played > 0 ? "played, needs verification or a staked match" : "hasn't played yet"}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
