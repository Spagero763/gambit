"use client";

import { Settings as SettingsIcon, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Logo } from "./Logo";
import { WalletPill } from "./WalletPill";
import { useSettings } from "@/lib/settings";

/**
 * Sticky header that condenses as you scroll.
 *
 * Layout note: the brand and the controls are separate flex children and the
 * brand is allowed to shrink (`min-w-0` + a truncating wordmark). Previously the
 * logo could not shrink, so on a 360px screen the control cluster was pushed
 * left and the sound button sat on top of the "Gambit" wordmark. The controls
 * are `shrink-0`, so the brand gives up space instead of overlapping.
 */
export function Header() {
  const { scrollY } = useScroll();
  const padY = useTransform(scrollY, [0, 90], [14, 8]);
  const logoScale = useTransform(scrollY, [0, 90], [1, 0.9]);
  const lineOpacity = useTransform(scrollY, [0, 90], [0, 1]);

  return (
    <header className="sticky top-0 z-50" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* solid fade so content scrolls cleanly under the bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-void/85 backdrop-blur-sm mask-fade-b" />
      <motion.div
        style={{ opacity: lineOpacity }}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
      <motion.div
        style={{ paddingTop: padY, paddingBottom: padY }}
        className="relative mx-auto flex w-full max-w-2xl items-center gap-2 px-4 min-[380px]:px-5 lg:max-w-6xl"
      >
        <Link href="/" aria-label="Home" className="min-w-0 shrink">
          <motion.div style={{ scale: logoScale, transformOrigin: "left center" }} whileTap={{ scale: 0.94 }}>
            <Logo />
          </motion.div>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 min-[380px]:gap-2">
          <MuteButton />
          <Link
            href="/settings"
            aria-label="Settings"
            className="group grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-void-700 text-ink-dim transition-colors hover:text-ink min-[380px]:h-10 min-[380px]:w-10"
          >
            <SettingsIcon className="h-[17px] w-[17px] transition-transform duration-500 ease-out group-hover:rotate-90" />
          </Link>
          <WalletPill />
        </div>
      </motion.div>
    </header>
  );
}

/**
 * One-tap mute, always visible. Sound effects ship ON (they make the games feel
 * alive) and this is the promised escape hatch — no popup asking about sound,
 * just an icon that is there when someone in a quiet place needs it. Muting
 * zeroes the SFX volume and pauses music; unmuting restores a sensible volume.
 */
function MuteButton() {
  const [settings, update] = useSettings();
  // the master switch: volume drives the sound effects, so treat it as "on/off"
  const muted = settings.volume <= 0;
  return (
    <button
      aria-label={muted ? "Turn sound on" : "Mute all sound"}
      // the tap itself is the user gesture browsers require before audio can
      // start, so turning it on here also starts the music (that is why it stayed
      // silent before — nothing switched music on)
      onClick={() => update(muted ? { volume: 0.5, musicOn: true } : { volume: 0, musicOn: false })}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-void-700 text-ink-dim transition-colors hover:text-ink min-[380px]:h-10 min-[380px]:w-10"
    >
      {muted ? <VolumeX className="h-[17px] w-[17px]" /> : <Volume2 className="h-[17px] w-[17px]" />}
    </button>
  );
}
