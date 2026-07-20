"use client";

import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { useAccount } from "wagmi";
import { useProgress, levelInfo } from "@/lib/progress";
import { useSettings, AVATAR_HEX } from "@/lib/settings";
import { rankForXp } from "@/lib/rank";
import { seasonName, seasonXp, seasonDaysLeft } from "@/lib/season";
import { Avatar } from "@/components/Avatar";
import { RankBadge } from "@/components/RankBadge";
import { ShareButton } from "@/components/ShareButton";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { inviteUrl } from "@/lib/share";

import { handleFor } from "@/lib/handle";

/**
 * The premium player identity card: avatar + rank emblem, named rank and
 * level, a progress bar to the next rank, headline stats, and a one-tap share.
 * The rank tints the whole card, so a Gold player's card literally looks
 * golden. This is the status artifact players chase and show off.
 */
export function PlayerCard() {
  const { address } = useAccount();
  const p = useProgress();
  const [settings] = useSettings();

  const { level } = levelInfo(p.xp);
  const rank = rankForXp(p.xp);
  const winRate = p.played > 0 ? Math.round((p.wins / p.played) * 100) : 0;
  const name = settings.name || handleFor(address);
  const flex = `${rank.name} rank on Gambit, level ${level}, winning ${winRate} percent of my games. Come lose to me.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border p-5 shadow-card"
      style={{ borderColor: `${rank.color}44`, background: `linear-gradient(150deg, ${rank.glow}, transparent 70%)` }}
    >
      {/* soft rank-coloured glow anchored top-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full blur-2xl"
        style={{ background: rank.glow }}
      />

      <div className="relative flex items-center gap-3.5">
        <div className="relative">
          <span className="block rounded-2xl p-[2px]" style={{ background: `linear-gradient(140deg, ${rank.color}, ${rank.color}44)` }}>
            <Avatar
              image={settings.avatarImage || undefined}
              color={AVATAR_HEX[settings.avatar] ?? AVATAR_HEX.teal}
              name={settings.name || (address ? address.slice(2, 4) : "GB")}
              size={52}
              rounded="rounded-[14px]"
            />
          </span>
          <span className="absolute -bottom-1.5 -right-1.5">
            <RankBadge rank={rank} size={26} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold tracking-tight text-ink">{name}</p>
          <p className="text-[13px] font-semibold" style={{ color: rank.color }}>
            {rank.name} · Level {level}
          </p>
        </div>

        <ShareButton
          text={flex}
          url={inviteUrl(address)}
          className="pressable inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-void-800 px-3 py-2 text-[12px] font-medium text-ink-dim transition-colors hover:text-ink"
        >
          <Share2 className="h-3.5 w-3.5" /> Share
        </ShareButton>
      </div>

      {/* progress to next rank */}
      <div className="relative mt-4">
        <div className="flex items-center justify-between text-[11px] text-ink-faint">
          <span>{rank.next ? `Climbing to ${rank.next.name}` : "Top rank reached"}</span>
          <span className="nums">{Math.round(rank.progress * 100)}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-void-800">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${rank.color}, ${rank.next?.color ?? rank.color})` }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(rank.progress * 100)}%` }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* headline stats */}
      <div className="relative mt-4 grid grid-cols-3 gap-2">
        <Stat label="Win rate" value={winRate} suffix="%" />
        <Stat label="Played" value={p.played} />
        <Stat label="Day streak" value={p.streak} />
      </div>

      {/* monthly season: a fresh climb every month, rank stays forever */}
      <div className="relative mt-3 flex items-center justify-between rounded-2xl border border-line bg-void-800/60 px-3.5 py-2.5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{seasonName()} season</p>
          <p className="text-[13px] font-bold text-ink">
            +{seasonXp(p.xp).toLocaleString()} <span className="text-[11px] font-medium text-ink-dim">XP this month</span>
          </p>
        </div>
        <p className="text-[11px] text-ink-faint">resets in {seasonDaysLeft()}d</p>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-void-800/60 px-3 py-2.5 text-center">
      <AnimatedNumber value={value} suffix={suffix} className="block text-lg font-bold text-ink" />
      <p className="mt-0.5 text-[10px] text-ink-faint">{label}</p>
    </div>
  );
}
