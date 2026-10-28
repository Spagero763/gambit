"use client";

import { useEffect, useState } from "react";
import { Coins, Users, Clock } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";

interface Split {
  waiting: number;
  paid: number;
}
interface Rewards {
  cashback: Split;
  referral: Split;
  minimum: number;
}
interface Friends {
  invited: number;
  friends: { name: string | null; played: number; earned: number }[];
}

/**
 * Cashback from your own money matches and your share of your friends' ones,
 * waiting and paid, with who earned it. Hidden until there is something to show.
 */
export function RewardsBoard({ address }: { address: string }) {
  const [r, setR] = useState<Rewards | null>(null);
  const [f, setF] = useState<Friends | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/rewards?address=${address}`)
      .then((x) => x.json())
      .then((d) => live && !d.error && setR(d))
      .catch(() => {});
    fetch(`/api/referrals?address=${address}`)
      .then((x) => x.json())
      .then((d) => live && !d.error && setF(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [address]);

  const total = r ? r.cashback.waiting + r.cashback.paid + r.referral.waiting + r.referral.paid : 0;
  if (!r || (total === 0 && !f?.invited)) return null;

  return (
    <div className="mt-3 rounded-2xl border border-line bg-void-700 p-5 shadow-card">
      <p className="text-sm font-semibold text-ink">Your rewards</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Tile icon={<Coins className="h-4 w-4 text-teal" />} label="Cashback" s={r.cashback} />
        <Tile icon={<Users className="h-4 w-4 text-teal" />} label="From friends" s={r.referral} />
      </div>
      <p className="mt-2 text-[14px] text-ink-faint">Paid to your wallet daily once it reaches ${r.minimum.toFixed(2)}.</p>

      {!!f?.friends.length && (
        <div className="mt-3 space-y-1.5">
          {f.friends.slice(0, 8).map((x, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-void-800/60 px-3 py-2 text-[14px]">
              <span className="truncate text-ink-dim">{x.name || `Friend ${i + 1}`}</span>
              <span className="ml-auto shrink-0">
                {x.earned > 0 ? (
                  <span className="nums font-semibold text-teal">+${x.earned.toFixed(2)}</span>
                ) : (
                  <span className="flex items-center gap-1 text-ink-faint">
                    <Clock className="h-3.5 w-3.5" /> no 1v1 yet
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

function Tile({ icon, label, s }: { icon: React.ReactNode; label: string; s: Split }) {
  return (
    <div className="rounded-xl border border-line bg-void-800 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[14px] text-ink-faint">
        {icon} {label}
      </p>
      <p className="nums mt-1 text-lg font-bold text-ink">
        $<AnimatedNumber value={s.waiting + s.paid} decimals={2} />
      </p>
      <p className="nums text-[14px] text-ink-faint">${s.paid.toFixed(2)} paid</p>
    </div>
  );
}
