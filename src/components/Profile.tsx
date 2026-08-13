"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Portal } from "@/components/Portal";
import { handleFor } from "@/lib/handle";
import { Wallet, ShieldCheck, Check, Loader2, Share2, Copy, Send, UserCog, Volume2, KeyRound, ChevronRight, X, ArrowLeft, Music } from "lucide-react";
import Link from "next/link";
import { inviteUrl } from "@/lib/share";
import { ShareButton } from "@/components/ShareButton";
import { formatUnits } from "viem";
import { useAccount, useSignMessage } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useInMiniPay } from "@/lib/minipay";
import { useStableBalances } from "@/hooks/useStableBalances";
import { supabase } from "@/lib/supabase";
import { useSettings, AVATARS, AVATAR_HEX } from "@/lib/settings";
import { useProgress } from "@/lib/progress";
import { useProfile, createProfile, setProfile } from "@/lib/profile";
import { Avatar } from "@/components/Avatar";
import { SendFunds } from "@/components/SendFunds";
import { InfoLinks } from "@/components/InfoLinks";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { PlayerCard } from "@/components/PlayerCard";
import { ReferralBoard } from "@/components/ReferralBoard";
import { symbolForToken } from "@/lib/tokens";
import { ProgressCard } from "@/components/Daily";
import { Achievements } from "@/components/Achievements";
import { SkeletonList } from "@/components/Skeleton";
import { GAMES } from "@/lib/games";
import { cn } from "@/lib/cn";

const FEE = 0.05;
const NAME: Record<string, string> = Object.fromEntries(GAMES.map((g) => [g.slug, g.name]));

interface MatchRow {
  id: number;
  game: string;
  stake: string;
  creator: string;
  opponent: string | null;
  status: string;
  winner: string | null;
  created_at: string;
  decimals: number | null;
  token: string | null;
}

interface Played {
  id: number;
  game: string;
  result: "win" | "lose" | "draw";
  delta: number;
  unit: string;
  when: string;
}

function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

/**
 * Shows the wallet address with a tap-to-copy. Matters most for email/social
 * sign-ins: their embedded wallet starts empty, so they need the full address
 * to deposit USDm/CELO into it before they can stake.
 */
function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };
  return (
    <button
      onClick={copy}
      title="Copy your full wallet address"
      className="group inline-flex items-center gap-1.5 font-mono text-xs text-ink-faint transition-colors hover:text-ink"
    >
      {short(address)}
      {copied ? (
        <Check className="h-3 w-3 text-teal" />
      ) : (
        <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />
      )}
      <span className="sr-only">Copy wallet address</span>
    </button>
  );
}

function relTime(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export function Profile() {
  const { address, isConnected } = useAccount();
  const { login } = usePrivy();
  // the stablecoin they actually hold the most of, not a hard-coded one
  const { preferred } = useStableBalances(address);
  const miniPay = useInMiniPay();
  const [settings] = useSettings();
  const [sendOpen, setSendOpen] = useState(false);
  const [rows, setRows] = useState<MatchRow[] | null>(null);
  const prog = useProgress();
  const { hasProfile, loading: profileLoading, profile: myProfile } = useProfile();
  const { signMessageAsync } = useSignMessage();

  const me = address?.toLowerCase();

  useEffect(() => {
    if (!supabase || !me) return;
    let active = true;
    (async () => {
      const { data } = await supabase!
        .from("matches")
        .select("id,game,stake,creator,opponent,status,winner,created_at,decimals,token")
        .or(`creator.eq.${me},opponent.eq.${me}`)
        .in("status", ["settling", "settled"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (active) setRows((data as MatchRow[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, [me]);

  const played = useMemo<Played[]>(() => {
    if (!rows || !me) return [];
    return rows.map((m) => {
      const stake = Number(formatUnits(BigInt(m.stake || "0"), m.decimals ?? 18));
      const isDraw = !m.winner;
      const won = m.winner?.toLowerCase() === me;
      const delta = isDraw ? 0 : won ? +(stake * (1 - FEE)).toFixed(4) : -stake;
      return {
        id: m.id,
        game: NAME[m.game] ?? m.game,
        result: isDraw ? "draw" : won ? "win" : "lose",
        delta,
        unit: symbolForToken(m.token),
        when: relTime(m.created_at),
      };
    });
  }, [rows, me]);

  const wins = played.filter((p) => p.result === "win").length;
  const losses = played.filter((p) => p.result === "lose").length;
  const decided = wins + losses;
  const winRate = decided ? Math.round((wins / decided) * 100) : 0;
  // P/L can't mix tokens — show the net for the token you've played most.
  const { net, netUnit } = useMemo(() => {
    const by: Record<string, { net: number; decided: number }> = {};
    for (const p of played) {
      const e = by[p.unit] ?? { net: 0, decided: 0 };
      e.net += p.delta;
      if (p.result !== "draw") e.decided += 1;
      by[p.unit] = e;
    }
    let unit = "USDm";
    let best = -1;
    for (const u of Object.keys(by)) {
      if (by[u].decided > best) {
        best = by[u].decided;
        unit = u;
      }
    }
    return { net: by[unit]?.net ?? 0, netUnit: unit };
  }, [played]);
  const avatarHex = AVATAR_HEX[settings.avatar] ?? AVATAR_HEX.teal;
  // never hex as a name — that is both unfriendly and a MiniPay listing rule.
  // (the address still shows in CopyAddress, where it IS an address, not a name)
  const displayName = settings.name || handleFor(address);

  if (!isConnected || !address) {
    return (
      <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-2 lg:max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <div className="mt-6 rounded-2xl border border-line bg-void-700 p-8 text-center shadow-card">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-void-600 text-teal">
            <Wallet className="h-5 w-5" />
          </span>
          {/* Inside MiniPay the wallet attaches by itself, so there is nothing to
              offer here and no sign-in button to show (review item 2). */}
          {miniPay ? (
            <p className="mt-4 text-sm text-ink-dim">Connecting your wallet…</p>
          ) : (
            <>
              <p className="mt-4 text-sm text-ink-dim">
                Sign in to see your record, net winnings and match history. Email or Google works — a wallet is created for you.
              </p>
              <button
                onClick={() => login()}
                className="btn-primary mt-5 w-full rounded-xl py-3 text-sm shadow-glow"
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <div className="mt-4">
          <ProgressCard />
        </div>
      </section>
    );
  }

  const amount = preferred.amount;

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-2 lg:max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-3.5"
      >
        <Avatar
          image={settings.avatarImage || undefined}
          color={avatarHex}
          name={displayName}
          size={56}
          rounded="rounded-2xl"
        />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">{displayName}</h1>
          {/* MiniPay: no raw address and no copy control. On the web the address
              is still needed to fund an embedded wallet, so it stays. */}
          {miniPay ? (
            <p className="text-[11px] text-ink-faint">Celo wallet</p>
          ) : (
            <CopyAddress address={address} />
          )}
        </div>
        <div className="ml-auto flex flex-col items-end gap-1.5">
          <div className="text-right">
            <AnimatedNumber value={amount} decimals={2} className="text-lg font-semibold text-ink" />
            <p className="text-[11px] text-ink-faint">{preferred.token.symbol} balance</p>
          </div>
          {/* Withdraw lives outside MiniPay only: MiniPay has its own withdraw
              screen, and duplicating it inside the Mini App was flagged in review. */}
          {!miniPay && (
            <button
              onClick={() => setSendOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-void-700 px-3 py-1.5 text-[12px] font-medium text-ink-dim transition-colors hover:border-line-strong hover:text-ink"
            >
              <Send className="h-3.5 w-3.5" /> Withdraw
            </button>
          )}
        </div>
      </motion.div>

      {sendOpen && !miniPay && <SendFunds address={address} onClose={() => setSendOpen(false)} />}

      <div className="mt-5">
        <PlayerCard />
      </div>

      {isConnected && address && !hasProfile && !profileLoading && (
        <ProfileSaveCard
          onSave={() =>
            createProfile(address, (a) => signMessageAsync({ message: a.message }), {
              name: settings.name,
              avatar: settings.avatar,
              avatarImage: settings.avatarImage,
              xp: prog.xp,
              streak: prog.streak,
              lastPlayed: prog.lastPlayed,
              played: prog.played,
              wins: prog.wins,
            }).then((res) => setProfile(address, res.profile))
          }
        />
      )}

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Net P/L" value={`${net >= 0 ? "+" : ""}${net.toFixed(2)}`} accent={net > 0 ? "text-teal" : net < 0 ? "text-rose" : "text-ink"} sub={netUnit} />
        <Stat label="Record" value={`${wins}–${losses}`} accent="text-ink" sub="W–L" />
        <Stat label="Win rate" value={decided ? `${winRate}%` : "—"} accent="text-ink" sub={`${decided} settled`} />
      </div>

      <div className="mt-5">
        <ProgressCard />
      </div>

      <div className="mt-4">
        {/* No address fallback. A wallet in a link people paste into group chats
            is a privacy leak and a MiniPay listing flag, so the card waits for
            the real short code rather than quietly using the address. */}
        <InviteCard refCode={(myProfile as any)?.ref_code ?? null} address={address.toLowerCase()} />
        <ReferralBoard address={address.toLowerCase()} />
      </div>

      <Achievements />

      {/* account — the Settings essentials, reachable from You (office-hours
          feedback: people expected this here, not only behind the gear) */}
      <AccountLinks />

      {/* support + the legal and how-to pages, in one obvious place */}
      <InfoLinks />

      <h2 className="mb-3 mt-7 text-[15px] font-semibold tracking-tight">Recent matches</h2>

      {rows === null && supabase ? (
        <SkeletonList rows={3} />
      ) : played.length === 0 ? (
        <div className="rounded-2xl border border-line bg-void-700 px-4 py-8 text-center">
          <p className="text-sm text-ink-dim">No staked matches yet.</p>
          <p className="mt-1 text-[12px] text-ink-faint">
            Play a staked 1v1 and your settled results show up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {played.slice(0, 10).map((m, i) => (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className="flex items-center justify-between rounded-xl border border-line bg-void-800 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-ink">{m.game}</p>
                <p className="text-[11px] text-ink-faint">Room #{m.id} · {m.when}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                    m.result === "win" && "bg-teal/12 text-teal",
                    m.result === "lose" && "bg-rose/12 text-rose",
                    m.result === "draw" && "bg-white/8 text-ink-dim"
                  )}
                >
                  {m.result}
                </span>
                <span
                  className={cn(
                    "nums w-24 text-right font-mono text-sm",
                    m.delta > 0 && "text-teal",
                    m.delta < 0 && "text-rose",
                    m.delta === 0 && "text-ink-faint"
                  )}
                >
                  {m.delta > 0 ? "+" : ""}
                  {m.delta.toFixed(2)}
                  <span className="ml-0.5 text-[9px] text-ink-faint">{m.unit}</span>
                </span>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}

type AccountView = "grid" | "profile" | "sound" | "wallet";

/**
 * Account, handled entirely in one popup. Every control (profile, sound, wallet
 * export, verify) opens inline as a sub-view — no jump to another page. The user
 * stays put and the popup swaps its body.
 */
function AccountLinks() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AccountView>("grid");
  const { address } = useAccount();
  const { user, exportWallet, authenticated, login } = usePrivy();
  const [settings, update] = useSettings();
  const { signMessageAsync } = useSignMessage();
  const prog = useProgress();

  const embedded = user?.linkedAccounts?.find(
    (a: any) => a.type === "wallet" && a.walletClientType === "privy"
  ) as { address?: string } | undefined;

  const close = () => {
    setOpen(false);
    setView("grid");
  };

  const tiles: { key: AccountView; icon: typeof UserCog; label: string; sub: string; tint: string }[] = [
    { key: "profile", icon: UserCog, label: "Profile", sub: "Name & avatar", tint: "text-violet-bright" },
    { key: "sound", icon: Volume2, label: "Sound", sub: "Music & effects", tint: "text-teal" },
    { key: "wallet", icon: KeyRound, label: "Wallet key", sub: "Export it", tint: "text-amber" },
  ];

  return (
    <div className="mt-7">
      <button
        onClick={() => setOpen(true)}
        className="pressable flex w-full items-center gap-3 rounded-2xl border border-line bg-void-800 px-4 py-3.5 text-left transition-colors hover:border-line-strong"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-void-600 text-ink-dim">
          <UserCog className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink">Account</span>
          <span className="block truncate text-[11px] text-ink-faint">Profile, sound, wallet key</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
      </button>

      <Portal>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 z-[120] grid place-items-end bg-void/80 backdrop-blur-md sm:place-items-center"
            >
              <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ y: 40, opacity: 0, scale: 0.96 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="max-h-[86dvh] w-full overflow-y-auto rounded-t-3xl border border-line bg-void-700 p-5 shadow-pop sm:w-[min(92%,26rem)] sm:rounded-3xl"
              >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {view !== "grid" && (
                      <button onClick={() => setView("grid")} aria-label="Back" className="text-ink-faint hover:text-ink">
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    )}
                    <p className="text-[15px] font-semibold tracking-tight text-ink capitalize">
                      {view === "grid" ? "Account" : view === "wallet" ? "Wallet key" : view}
                    </p>
                  </div>
                  <button onClick={close} aria-label="Close" className="text-ink-faint hover:text-ink">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={view}
                    initial={{ opacity: 0, x: view === "grid" ? -12 : 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: view === "grid" ? 12 : -12 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {view === "grid" && (
                      <div className="grid grid-cols-2 gap-2.5">
                        {tiles.map((t, i) => (
                          <motion.button
                            key={t.key}
                            onClick={() => setView(t.key)}
                            initial={{ opacity: 0, y: 14, scale: 0.94 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: 0.04 + i * 0.05, type: "spring", stiffness: 340, damping: 24 }}
                            className="pressable flex h-full flex-col gap-2 rounded-2xl border border-line bg-void-800 p-3.5 text-left transition-colors hover:border-line-strong"
                          >
                            <span className={cn("grid h-9 w-9 place-items-center rounded-xl bg-void-600", t.tint)}>
                              <t.icon className="h-4 w-4" />
                            </span>
                            <span>
                              <span className="block text-[13px] font-semibold text-ink">{t.label}</span>
                              <span className="block text-[11px] text-ink-faint">{t.sub}</span>
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {view === "profile" && (
                      <ProfilePanel
                        settings={settings}
                        update={update}
                        onSave={
                          address
                            ? () =>
                                createProfile(address, (a) => signMessageAsync({ message: a.message }), {
                                  name: settings.name,
                                  avatar: settings.avatar,
                                  avatarImage: settings.avatarImage,
                                  xp: prog.xp,
                                  streak: prog.streak,
                                  lastPlayed: prog.lastPlayed,
                                  played: prog.played,
                                  wins: prog.wins,
                                }).then((res) => setProfile(address, res.profile))
                            : null
                        }
                      />
                    )}

                    {view === "sound" && <SoundPanel settings={settings} update={update} />}

                    {view === "wallet" &&
                      (embedded?.address ? (
                        <WalletPanel onExport={() => exportWallet({ address: embedded.address as string })} />
                      ) : (
                        <p className="py-6 text-center text-[13px] text-ink-dim">
                          {authenticated
                            ? "You are using an external wallet, so you already hold your own key."
                            : "Sign in first to manage your wallet."}
                        </p>
                      ))}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}

/** Inline name + avatar editor. Saving syncs the name to leaderboards. */
function ProfilePanel({
  settings,
  update,
  onSave,
}: {
  settings: ReturnType<typeof useSettings>[0];
  update: ReturnType<typeof useSettings>[1];
  onSave: (() => Promise<unknown>) | null;
}) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Display name</label>
      <input
        value={settings.name}
        onChange={(e) => update({ name: e.target.value.slice(0, 24) })}
        placeholder="What people call you"
        className="mt-1.5 w-full rounded-xl border border-line bg-void-800 px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-teal/50"
      />

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Avatar colour</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {AVATARS.map((a) => (
          <button
            key={a}
            onClick={() => update({ avatar: a })}
            className={cn(
              "h-9 w-9 rounded-full ring-2 ring-offset-2 ring-offset-void-700 transition-all",
              settings.avatar === a ? "ring-ink" : "ring-transparent"
            )}
            style={{ background: AVATAR_HEX[a] }}
            aria-label={a}
          />
        ))}
      </div>

      {onSave && (
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            setSaved(false);
            try {
              await onSave();
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            } catch (e: any) {
              setErr(e?.shortMessage ?? e?.message ?? "Could not save");
            } finally {
              setBusy(false);
            }
          }}
          className="btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm shadow-glow disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {busy ? "Check your wallet…" : saved ? "Saved to leaderboards" : "Save"}
        </button>
      )}
      {err && <p className="mt-2 text-[11px] text-rose">{err}</p>}
      <p className="mt-2 text-[11px] text-ink-faint">Your name shows on every leaderboard and match.</p>
    </div>
  );
}

/** Inline sound controls: music toggle + separate effect and music volumes. */
function SoundPanel({
  settings,
  update,
}: {
  settings: ReturnType<typeof useSettings>[0];
  update: ReturnType<typeof useSettings>[1];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-line bg-void-800 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Music className="h-4 w-4 text-teal" />
          <span className="text-sm font-medium text-ink">Background music</span>
        </div>
        <button
          onClick={() => update({ musicOn: !settings.musicOn })}
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            settings.musicOn ? "bg-teal" : "bg-void-600"
          )}
          aria-label="Toggle music"
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
              settings.musicOn ? "translate-x-[22px]" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      <div>
        <p className="mb-1.5 flex items-center justify-between text-xs text-ink-faint">
          <span>Game sounds</span>
          <span className="nums text-ink-dim">{Math.round(settings.volume * 100)}%</span>
        </p>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(settings.volume * 100)}
          onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
          className="w-full accent-teal"
        />
      </div>

      {settings.musicOn && (
        <div>
          <p className="mb-1.5 flex items-center justify-between text-xs text-ink-faint">
            <span>Music</span>
            <span className="nums text-ink-dim">{Math.round((settings.musicVolume ?? 0.3) * 100)}%</span>
          </p>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((settings.musicVolume ?? 0.3) * 100)}
            onChange={(e) => update({ musicVolume: Number(e.target.value) / 100 })}
            className="w-full accent-violet-bright"
          />
        </div>
      )}
      <p className="text-[11px] text-ink-faint">Music streams only while it&apos;s on, and stays mixed under the game.</p>
    </div>
  );
}

/** Inline wallet key export — Privy opens its own secure reveal, no page jump. */
function WalletPanel({ onExport }: { onExport: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <p className="text-[13px] leading-snug text-ink-dim">
        This wallet is yours. You can export the key and use it in any wallet app. We never see it or store it.
      </p>
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="mt-4 w-full rounded-xl border border-line bg-void-800 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-amber/40"
        >
          Show my private key
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-rose/40 bg-rose/[0.07] p-3">
          <p className="text-[12px] font-semibold text-rose">Read this first</p>
          <p className="mt-1 text-[11px] leading-snug text-ink-dim">
            Anyone with this key can take everything in your wallet. Never share it, and never send it to anyone,
            including us. If you lose it, nobody can recover it for you.
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
                  await onExport();
                } catch {
                  /* user closed the modal */
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose py-2.5 text-[12px] font-bold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              I understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InviteCard({ refCode, address }: { refCode: string | null; address: string }) {
  const url = inviteUrl(refCode);
  // What the player reads on the card: the domain and their code, without the
  // https:// and without a query string. Copying still puts the full URL on the
  // clipboard — this is only what fits on one line and stays memorable.
  const pretty = refCode ? `bestgambit.live/?ref=${refCode}` : null;
  const [copied, setCopied] = useState(false);
  const [per, setPer] = useState(0);
  // the vault's own payout token, so the card never names one it cannot pay
  const [sym, setSym] = useState("USDm");

  // live bonus amount from the server, so the card always tells the truth
  useEffect(() => {
    fetch(`/api/referrals?address=${address}`)
      .then((r) => r.json())
      .then((d) => {
        setPer(Number(d?.perFriend) || 0);
        if (d?.symbol) setSym(String(d.symbol));
      })
      .catch(() => {});
  }, [address]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const fmt = (n: number) => Number(n.toFixed(2)).toString();

  return (
    <div className="rounded-2xl border border-line bg-void-700 p-5 shadow-card">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-ink">Invite friends, earn {sym}</p>
        <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-semibold text-teal">LIVE</span>
      </div>
      <p className="mt-0.5 text-[12px] text-ink-dim">
        {per > 0
          ? `You earn ${fmt(per)} ${sym} for every friend who joins with your link and plays a staked match. That is the only condition. Paid straight to your wallet from an on chain vault.`
          : `You earn a bonus for every friend who joins with your link and plays a staked match, paid straight to your wallet from an on chain vault.`}{" "}
        Tap the link to copy it.
      </p>
      {per > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {[5, 10, 25].map((n) => (
            <span key={n} className="rounded-full border border-teal/25 bg-teal/[0.07] px-2.5 py-1 text-[11px] font-semibold text-teal">
              {n} friends = {fmt(per * n)} {sym}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={copy}
          disabled={!pretty}
          title={pretty ? "Copy your invite link" : "Your link is being created"}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-line bg-void-800 px-3 py-2.5 text-left text-[12px] text-ink-dim transition-colors hover:border-line-strong hover:text-ink disabled:opacity-60 disabled:hover:border-line"
        >
          <span className="truncate">{pretty ?? "Creating your link…"}</span>
          {pretty ? (
            copied ? <Check className="h-3.5 w-3.5 shrink-0 text-teal" /> : <Copy className="h-3.5 w-3.5 shrink-0 opacity-60" />
          ) : null}
        </button>
        {pretty && (
          <ShareButton
            text="Come play me on Gambit. Real games, real money, and you can start free. Use my link."
            url={url}
            className="btn-primary flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm shadow-glow"
          >
            <Share2 className="h-4 w-4" /> Share
          </ShareButton>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-line bg-void-700 p-3.5 shadow-card">
      <p className="text-[11px] text-ink-faint">{label}</p>
      <p className={cn("nums mt-2 text-xl font-semibold tracking-tight", accent)}>{value}</p>
      <p className="mt-0.5 text-[10px] text-ink-faint">{sub}</p>
    </div>
  );
}

function ProfileSaveCard({ onSave }: { onSave: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="mt-5 rounded-2xl border border-teal/40 bg-teal/[0.06] p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-void-700 text-teal">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Save your profile</p>
          <p className="mt-0.5 text-[12px] text-ink-dim">
            Sign once (free, no network fee) to save your name, photo and streak to this wallet — synced across devices.
          </p>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await onSave();
              } catch (e: any) {
                setErr(e?.shortMessage ?? e?.message ?? "Could not save profile");
              } finally {
                setBusy(false);
              }
            }}
            className="btn-primary mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm shadow-glow disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {busy ? "Check your wallet…" : "Sign & save profile"}
          </button>
          {err && <p className="mt-2 text-[11px] text-rose">{err}</p>}
        </div>
      </div>
    </div>
  );
}
