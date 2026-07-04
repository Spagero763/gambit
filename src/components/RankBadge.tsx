"use client";

import { Shield, Award, Gem, Crown } from "lucide-react";
import type { Rank } from "@/lib/rank";

// icon climbs with prestige: shield → medal → gem → crown
function iconFor(index: number) {
  if (index >= 6) return Crown;
  if (index >= 4) return Gem;
  if (index >= 1) return Award;
  return Shield;
}

/**
 * The rank emblem: a gem-cut badge filled with the rank's colour, used
 * everywhere a player's standing should show (player card, leaderboard,
 * header). Pure CSS/SVG, no assets, cheap to render on low-end phones.
 */
export function RankBadge({ rank, size = 32 }: { rank: Rank; size?: number }) {
  const Icon = iconFor(rank.index);
  return (
    <span
      className="relative inline-grid shrink-0 place-items-center rounded-[30%]"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(130% 130% at 30% 18%, ${rank.color}, ${rank.color}cc 55%, ${rank.color}66)`,
        boxShadow: `inset 0 1px 1px rgba(255,255,255,0.5), 0 0 0 1px ${rank.color}55, 0 4px 14px -5px ${rank.color}`,
      }}
      aria-label={`${rank.name} rank`}
    >
      <Icon style={{ width: size * 0.52, height: size * 0.52 }} strokeWidth={2.4} className="text-void/85" />
    </span>
  );
}
