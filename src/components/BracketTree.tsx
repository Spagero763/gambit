"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Play, Trophy } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { PublicProfile, displayName, avatarHex } from "@/lib/profiles";
import { BracketMatch, TournamentRow } from "@/lib/tournamentClient";
import { cn } from "@/lib/cn";

/**
 * The tournament table — football-knockout style. Rounds stack top to bottom
 * (Quarter-finals → Semi-finals → Final, bronze beneath); when a match ends,
 * the winner pops into their slot in the next round so everyone watching the
 * table sees who advances.
 */

interface Round {
  label: string;
  slots: number[];
  final?: boolean;
  bronze?: boolean;
}

function rounds(capacity: number): Round[] {
  if (capacity === 8) {
    return [
      { label: "Quarter-finals", slots: [0, 1, 2, 3] },
      { label: "Semi-finals", slots: [4, 5] },
      { label: "Final", slots: [7], final: true },
      { label: "Bronze match", slots: [6], bronze: true },
    ];
  }
  return [
    { label: "Semi-finals", slots: [0, 1] },
    { label: "Final", slots: [3], final: true },
    { label: "Bronze match", slots: [2], bronze: true },
  ];
}

/** Which earlier slots feed a given slot (for "Winner of …" placeholders). */
function feeders(capacity: number, slot: number): { from: [number, number]; losers: boolean } | null {
  if (capacity === 8) {
    if (slot === 4) return { from: [0, 1], losers: false };
    if (slot === 5) return { from: [2, 3], losers: false };
    if (slot === 7) return { from: [4, 5], losers: false };
    if (slot === 6) return { from: [4, 5], losers: true };
  } else {
    if (slot === 3) return { from: [0, 1], losers: false };
    if (slot === 2) return { from: [0, 1], losers: true };
  }
  return null;
}

const shortLabel = (capacity: number, slot: number) =>
  capacity === 8 ? (slot <= 3 ? `QF${slot + 1}` : slot <= 5 ? `SF${slot - 3}` : slot === 6 ? "Bronze" : "Final") : slot <= 1 ? `SF${slot + 1}` : slot === 2 ? "Bronze" : "Final";

function Chip({
  addr,
  me,
  profiles,
  won,
  lost,
  big,
}: {
  addr: string;
  me?: string;
  profiles: Record<string, PublicProfile>;
  won?: boolean;
  lost?: boolean;
  big?: boolean;
}) {
  const a = addr.toLowerCase();
  const p = profiles[a];
  return (
    <motion.div
      initial={{ opacity: 0, y: -14, scale: 0.7 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-2.5",
        big ? "py-2.5" : "py-2",
        won ? "border-teal/50 bg-teal/[0.1]" : "border-line bg-void-700",
        lost && "opacity-45"
      )}
    >
      <Avatar image={p?.avatar_image || undefined} color={avatarHex(p)} name={displayName(a, p)} size={big ? 30 : 24} rounded="rounded-md" />
      <p className={cn("truncate font-medium text-ink", big ? "text-[13px]" : "text-[12px]")}>
        {displayName(a, p)}
        {a === me ? <span className="text-teal"> (you)</span> : ""}
      </p>
      {won && <Trophy className="ml-auto h-3.5 w-3.5 shrink-0 text-amber" />}
    </motion.div>
  );
}

function Placeholder({ text, big }: { text: string; big?: boolean }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center justify-center rounded-xl border border-dashed border-line bg-void-800/50 px-2.5 text-[11px] text-ink-faint",
        big ? "py-3" : "py-2.5"
      )}
    >
      {text}
    </div>
  );
}

export function BracketTree({
  tournament: t,
  bracket,
  me,
  profiles,
  onPlay,
}: {
  tournament: TournamentRow;
  bracket: BracketMatch[];
  me?: string;
  profiles: Record<string, PublicProfile>;
  onPlay: (m: BracketMatch) => void;
}) {
  const bySlot: Record<number, BracketMatch> = {};
  for (const m of bracket) bySlot[m.bracket_slot] = m;

  return (
    <div className="mt-6">
      {rounds(t.capacity).map((round, ri) => (
        <div key={round.label}>
          {ri > 0 && (
            <div className="flex flex-col items-center py-1.5">
              <span className="h-4 w-px bg-line" />
              <ChevronDown className="h-3.5 w-3.5 text-ink-faint" />
            </div>
          )}
          <p
            className={cn(
              "mb-2 text-center text-[11px] font-bold uppercase tracking-[0.18em]",
              round.final ? "text-amber" : round.bronze ? "text-[#c08457]" : "text-ink-faint"
            )}
          >
            {round.final && "🏆 "}
            {round.label}
            {round.bronze && " 🥉"}
          </p>

          <div className={cn("grid gap-2.5", round.slots.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
            {round.slots.map((slot, si) => {
              const m = bySlot[slot];
              const f = feeders(t.capacity, slot);
              const w = m?.winner?.toLowerCase() ?? null;
              const mine = !!me && !!m && [m.creator, m.opponent].some((a) => a?.toLowerCase() === me);
              const toMove = m?.turn?.toLowerCase() ?? null;

              return (
                <motion.div
                  key={slot}
                  initial={{ opacity: 0, y: 18, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: ri * 0.12 + si * 0.06, type: "spring", stiffness: 260, damping: 24 }}
                  className={cn(
                    "rounded-2xl border p-3",
                    round.final ? "border-amber/40 bg-amber/[0.05]" : "border-line bg-void-800",
                    mine && m?.status === "active" && "ring-1 ring-teal/50"
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{shortLabel(t.capacity, slot)}</span>
                    <span className={cn("text-[10px] font-semibold", m?.status === "active" ? "text-teal" : "text-ink-faint")}>
                      {!m
                        ? "Waiting"
                        : m.status === "settled"
                          ? "Finished"
                          : toMove
                            ? toMove === me
                              ? "Your move!"
                              : `${displayName(toMove, profiles[toMove])} to move`
                            : "Live"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <AnimatePresence mode="popLayout">
                      {m ? (
                        <Chip key={m.creator} addr={m.creator} me={me} profiles={profiles} won={w === m.creator.toLowerCase()} lost={!!w && w !== m.creator.toLowerCase()} big={round.final} />
                      ) : (
                        <Placeholder key="pa" text={f ? `${f.losers ? "Loser" : "Winner"} of ${shortLabel(t.capacity, f.from[0])}` : "TBD"} big={round.final} />
                      )}
                    </AnimatePresence>
                    <span className={cn("shrink-0 font-display text-[11px] font-black", round.final ? "text-amber" : "text-ink-faint")}>VS</span>
                    <AnimatePresence mode="popLayout">
                      {m?.opponent ? (
                        <Chip key={m.opponent} addr={m.opponent} me={me} profiles={profiles} won={w === m.opponent.toLowerCase()} lost={!!w && w !== m.opponent.toLowerCase()} big={round.final} />
                      ) : (
                        <Placeholder key="pb" text={f ? `${f.losers ? "Loser" : "Winner"} of ${shortLabel(t.capacity, f.from[1])}` : "TBD"} big={round.final} />
                      )}
                    </AnimatePresence>
                  </div>

                  {mine && m?.status === "active" && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => onPlay(m)}
                      className="btn-primary mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] shadow-glow"
                    >
                      <Play className="h-3.5 w-3.5" /> Play this match
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
