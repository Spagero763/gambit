"use client";

import { useAccount, useSignMessage } from "wagmi";
import { createProfile, hasToken, setProfile } from "@/lib/profile";
import { useSettings } from "@/lib/settings";
import { useProgress } from "@/lib/progress";
import { useInMiniPay } from "@/lib/minipay";

/**
 * How this player can save their profile to their account:
 *  - "save": a session exists, no prompt at all
 *  - "sign": web wallet without one, a free signature proves it
 *  - "later": MiniPay without one; MiniPay apps may not ask for signatures, so
 *    it stays on the phone until a first money match brings a session
 */
export function useSaveProfile() {
  const { address } = useAccount();
  const miniPay = useInMiniPay();
  const { signMessageAsync } = useSignMessage();
  const [settings] = useSettings();
  const prog = useProgress();

  const mode: "save" | "sign" | "later" = hasToken(address) ? "save" : miniPay ? "later" : "sign";
  const save =
    address && mode !== "later"
      ? () =>
          createProfile(address, miniPay ? null : (a) => signMessageAsync({ message: a.message }), {
            name: settings.name,
            avatar: settings.avatar,
            avatarImage: settings.avatarImage,
            xp: prog.xp,
            streak: prog.streak,
            lastPlayed: prog.lastPlayed,
            played: prog.played,
            wins: prog.wins,
          }).then((res) => setProfile(address, res.profile))
      : null;

  return { mode, save };
}
