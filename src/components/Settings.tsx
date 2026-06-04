"use client";

import { motion } from "framer-motion";
import { Volume2, Music, User as UserIcon, Check } from "lucide-react";
import { useSettings, TRACKS, AVATARS } from "@/lib/settings";
import { play } from "@/lib/sfx";
import { cn } from "@/lib/cn";

const AVATAR_GRAD: Record<string, string> = {
  violet: "from-violet to-violet-deep",
  teal: "from-teal to-teal-deep",
  amber: "from-amber to-[#b9742a]",
  rose: "from-rose to-[#b13a63]",
  sky: "from-[#7fd7ff] to-[#2a6f9e]",
  lime: "from-[#b6f36a] to-[#5c9e1d]",
};

export function Settings() {
  const [s, update] = useSettings();

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-2">
      <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="font-display text-2xl font-bold">
        Settings
      </motion.h1>

      {/* Profile */}
      <div className="mt-6 rounded-3xl glass p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <UserIcon className="h-4 w-4 text-violet-bright" /> Profile
        </div>

        <label className="mb-1 block text-xs text-ink-faint">Display name</label>
        <input
          value={s.name}
          onChange={(e) => update({ name: e.target.value.slice(0, 20) })}
          placeholder="Pick a name"
          className="mb-4 w-full rounded-xl bg-white/[0.04] px-4 py-2.5 text-sm text-ink outline-none ring-1 ring-white/10 placeholder:text-ink-faint focus:ring-violet/50"
        />

        <p className="mb-2 text-xs text-ink-faint">Avatar</p>
        <div className="flex flex-wrap gap-2.5">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => {
                update({ avatar: a });
                play("tap");
              }}
              className={cn(
                "relative grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br text-sm font-bold text-void",
                AVATAR_GRAD[a],
                s.avatar === a ? "ring-2 ring-white/80" : "ring-1 ring-white/10"
              )}
            >
              {(s.name || "G").slice(0, 1).toUpperCase()}
              {s.avatar === a && (
                <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-teal text-void">
                  <Check className="h-2.5 w-2.5" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sound */}
      <div className="mt-4 rounded-3xl glass p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <Volume2 className="h-4 w-4 text-teal" /> Sound
        </div>

        <Toggle label="Sound effects" sub="Taps, wins, card deals" on={s.soundOn} onChange={(v) => { update({ soundOn: v }); if (v) play("tap"); }} />
        <Toggle label="Background music" sub="Plays while you browse and play" on={s.musicOn} onChange={(v) => update({ musicOn: v })} />

        <div className="mt-4">
          <p className="mb-1 flex items-center justify-between text-xs text-ink-faint">
            <span>Volume</span>
            <span>{Math.round(s.volume * 100)}%</span>
          </p>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(s.volume * 100)}
            onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
            className="w-full accent-teal"
          />
        </div>

        <p className="mb-2 mt-4 flex items-center gap-1.5 text-xs text-ink-faint">
          <Music className="h-3.5 w-3.5" /> Track
        </p>
        <div className="grid grid-cols-2 gap-2">
          {TRACKS.map((t) => (
            <button
              key={t.id}
              onClick={() => update({ track: t.id, musicOn: true })}
              className={cn(
                "rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                s.track === t.id ? "bg-gradient-to-r from-violet-deep to-violet text-white" : "bg-white/[0.04] text-ink-dim"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Toggle({ label, sub, on, onChange }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center justify-between py-2.5 text-left">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-[11px] text-ink-faint">{sub}</span>
      </span>
      <span className={cn("relative h-6 w-11 rounded-full transition-colors", on ? "bg-teal" : "bg-white/15")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", on ? "left-[1.375rem]" : "left-0.5")} />
      </span>
    </button>
  );
}
