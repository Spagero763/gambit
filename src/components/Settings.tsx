"use client";

import { useState } from "react";
import Link from "next/link";
import { Volume2, Music, User as UserIcon, Check, Camera, Trash2, ShieldCheck, Loader2, Wallet, Bell, LifeBuoy, KeyRound } from "lucide-react";
import { PushToggle } from "@/components/PushToggle";
import { useAccount, useSignMessage } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useSettings, AVATARS, AVATAR_HEX } from "@/lib/settings";
import { useProgress } from "@/lib/progress";
import { useProfile, createProfile, setProfile } from "@/lib/profile";
import { Avatar } from "@/components/Avatar";
import { play } from "@/lib/sfx";
import { cn } from "@/lib/cn";

/** Read a file, centre-crop and downscale to a 160px square JPEG data URL. */
function fileToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const N = 160;
        const c = document.createElement("canvas");
        c.width = c.height = N;
        const ctx = c.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, N, N);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function Settings() {
  const [s, update] = useSettings();
  const { address, isConnected } = useAccount();
  const { login, logout, authenticated } = usePrivy();
  const { signMessageAsync } = useSignMessage();
  const { hasProfile } = useProfile();
  const prog = useProgress();

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-2">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      {/* Profile */}
      <div className="mt-6 rounded-2xl border border-line bg-void-700 p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <UserIcon className="h-4 w-4 text-ink-dim" /> Profile
        </div>

        {/* Photo */}
        <div className="mb-4 flex items-center gap-3">
          <Avatar
            image={s.avatarImage || undefined}
            color={AVATAR_HEX[s.avatar] ?? AVATAR_HEX.teal}
            name={s.name}
            size={56}
            rounded="rounded-2xl"
          />
          <div className="flex flex-col gap-1.5">
            <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-void-800 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-void-600">
              <Camera className="h-3.5 w-3.5" />
              {s.avatarImage ? "Change photo" : "Upload photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const data = await fileToAvatar(file);
                    update({ avatarImage: data });
                    play("tap");
                  } catch {
                    /* ignore unreadable images */
                  }
                  e.target.value = "";
                }}
              />
            </label>
            {s.avatarImage && (
              <button
                onClick={() => update({ avatarImage: "" })}
                className="inline-flex w-fit items-center gap-1.5 text-[11px] text-ink-faint transition-colors hover:text-rose"
              >
                <Trash2 className="h-3 w-3" /> Remove photo
              </button>
            )}
          </div>
        </div>

        <label className="mb-1.5 block text-xs text-ink-faint">Display name</label>
        <input
          value={s.name}
          onChange={(e) => update({ name: e.target.value.slice(0, 20) })}
          placeholder="Pick a name"
          className="mb-4 w-full rounded-xl border border-line bg-void-800 px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-teal/50"
        />

        <p className="mb-2 text-xs text-ink-faint">Avatar colour {s.avatarImage && "(shown when no photo)"}</p>
        <div className="flex flex-wrap gap-2.5">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => {
                update({ avatar: a });
                play("tap");
              }}
              className={cn(
                "relative grid h-11 w-11 place-items-center rounded-xl text-sm font-semibold text-void transition-transform active:scale-95",
                s.avatar === a ? "ring-2 ring-white/85" : "ring-1 ring-white/10"
              )}
              style={{ background: AVATAR_HEX[a] }}
              aria-label={`Avatar ${a}`}
            >
              {(s.name || "G").slice(0, 1).toUpperCase()}
              {s.avatar === a && (
                <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-teal text-void ring-2 ring-void-700">
                  <Check className="h-2.5 w-2.5" />
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Save profile to wallet */}
        <div className="mt-5 border-t border-line pt-4">
          {!isConnected || !address ? (
            <button
              onClick={() => login()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-void-800 py-2.5 text-sm font-medium text-ink-dim transition-colors hover:text-ink"
            >
              <Wallet className="h-4 w-4" /> Sign in to save your profile
            </button>
          ) : (
            <SaveProfileButton
              hasProfile={hasProfile}
              onSave={() =>
                createProfile(address, (a) => signMessageAsync({ message: a.message }), {
                  name: s.name,
                  avatar: s.avatar,
                  avatarImage: s.avatarImage,
                  xp: prog.xp,
                  streak: prog.streak,
                  lastPlayed: prog.lastPlayed,
                  played: prog.played,
                  wins: prog.wins,
                }).then((res) => setProfile(address, res.profile))
              }
            />
          )}
          <p className="mt-2 text-[11px] text-ink-faint">
            Signing is free (no gas). Saves your name, photo and streak to your wallet, synced across devices.
          </p>
          {authenticated && (
            <button
              onClick={() => logout()}
              className="mt-3 text-[12px] font-medium text-ink-faint underline-offset-2 transition-colors hover:text-rose hover:underline"
            >
              Sign out
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="mt-4 rounded-2xl border border-line bg-void-700 p-5 shadow-card">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
          <Bell className="h-4 w-4 text-ink-dim" /> Notifications
        </div>
        <PushToggle />
      </div>

      {/* Sound */}
      <div className="mt-4 rounded-2xl border border-line bg-void-700 p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <Volume2 className="h-4 w-4 text-ink-dim" /> Sound
        </div>

        <Toggle
          label="Sound effects"
          sub="Taps, wins, card deals"
          on={s.soundOn}
          onChange={(v) => {
            update({ soundOn: v });
            if (v) play("tap");
          }}
        />
        <div className="my-1 h-px bg-line" />
        <Toggle
          label="Background music"
          sub="Each game has its own soundtrack"
          on={s.musicOn}
          onChange={(v) => update({ musicOn: v })}
        />

        <div className="mt-4">
          <p className="mb-1.5 flex items-center justify-between text-xs text-ink-faint">
            <span>Game sounds</span>
            <span className="nums text-ink-dim">{Math.round(s.volume * 100)}%</span>
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

        {s.musicOn && (
          <div className="mt-3">
            <p className="mb-1.5 flex items-center justify-between text-xs text-ink-faint">
              <span>Music</span>
              <span className="nums text-ink-dim">{Math.round((s.musicVolume ?? 0.3) * 100)}%</span>
            </p>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round((s.musicVolume ?? 0.3) * 100)}
              onChange={(e) => update({ musicVolume: Number(e.target.value) / 100 })}
              className="w-full accent-violet-bright"
            />
          </div>
        )}

        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-ink-faint">
          <Music className="h-3.5 w-3.5" /> The music changes to match the game you&apos;re playing. It uses mobile data, so it streams only while it&apos;s on.
        </p>
        <p className="mt-1 text-[10px] text-ink-faint">Music by Kevin MacLeod (incompetech.com) · CC BY 4.0</p>
      </div>

      {/* support — a real human answers on WhatsApp; required to be reachable in-app */}
      <a
        href="https://wa.me/2348060158364?text=Hi%20Gambit%20support%2C%20I%20need%20help%20with"
        target="_blank"
        rel="noreferrer"
        className="mt-6 flex items-center gap-3 rounded-2xl border border-teal/30 bg-teal/[0.06] p-4 transition-colors hover:border-teal/50"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal/15 text-teal">
          <LifeBuoy className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-ink">Need help? Message us on WhatsApp</span>
          <span className="block text-[11px] text-ink-faint">Payment issues, stuck games, anything. A real person replies fast.</span>
        </span>
      </a>

      {/* your wallet is YOURS — key export (embedded wallets only) */}
      <ExportWallet />

      {/* legal — required to be reachable in-app (MiniPay listing rule) */}
      <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-ink-faint">
        <Link href="/terms" className="transition-colors hover:text-ink">Terms of Service</Link>
        <span>·</span>
        <Link href="/privacy" className="transition-colors hover:text-ink">Privacy Policy</Link>
      </div>
    </section>
  );
}

/**
 * Export your wallet's private key.
 *
 * This is what makes Gambit genuinely yours: the escrow has no owner withdraw,
 * and you can walk away with your wallet whenever you like. Privy opens its own
 * secure modal to reveal the key — it never touches our servers or our code.
 *
 * Only shown for Privy EMBEDDED wallets. People who signed in with MiniPay or
 * another wallet already hold their own keys, so there is nothing to export.
 */
function ExportWallet() {
  const { exportWallet, user, authenticated } = usePrivy();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const embedded = user?.linkedAccounts?.find(
    (a: any) => a.type === "wallet" && a.walletClientType === "privy"
  ) as { address?: string } | undefined;

  if (!authenticated || !embedded?.address) return null;

  return (
    <div className="mt-6 rounded-2xl border border-line bg-void-800 p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber/15 text-amber">
          <KeyRound className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Export your wallet</p>
          <p className="text-[11px] text-ink-faint">
            This wallet is yours. Take the key and use it in any wallet app you like.
          </p>
        </div>
      </div>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="mt-3 w-full rounded-xl border border-line bg-void-700 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-amber/40"
        >
          Show my private key
        </button>
      ) : (
        <div className="mt-3 rounded-xl border border-rose/40 bg-rose/[0.07] p-3">
          <p className="text-[12px] font-semibold text-rose">Read this first</p>
          <p className="mt-1 text-[11px] leading-snug text-ink-dim">
            Anyone who has this key can take everything in your wallet. Never share it, never paste it into any website,
            and never send it to anyone, including us. If you lose it, nobody can recover it for you.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-xl border border-line bg-void-700 py-2.5 text-[12px] font-semibold text-ink-dim transition-colors hover:text-ink"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                setBusy(true);
                try {
                  await exportWallet({ address: embedded.address as string });
                } catch {
                  /* user closed the modal */
                } finally {
                  setBusy(false);
                  setConfirming(false);
                }
              }}
              disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose py-2.5 text-[12px] font-bold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              I understand, show it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SaveProfileButton({ hasProfile, onSave }: { hasProfile: boolean; onSave: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          setSaved(false);
          try {
            await onSave();
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
          } catch (e: any) {
            setErr(e?.shortMessage ?? e?.message ?? "Could not save profile");
          } finally {
            setBusy(false);
          }
        }}
        className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm shadow-glow disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        {busy ? "Check your wallet…" : saved ? "Saved" : hasProfile ? "Update profile" : "Sign & save profile"}
      </button>
      {err && <p className="mt-1.5 text-[11px] text-rose">{err}</p>}
    </div>
  );
}

function Toggle({ label, sub, on, onChange }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center justify-between py-2.5 text-left">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-[11px] text-ink-faint">{sub}</span>
      </span>
      <span className={cn("relative h-6 w-11 rounded-full transition-colors", on ? "bg-teal" : "bg-void-600")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[1.375rem]" : "left-0.5")} />
      </span>
    </button>
  );
}
