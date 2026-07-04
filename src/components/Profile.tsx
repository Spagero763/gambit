"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, ShieldCheck, Check, Loader2, Share2, Copy, Send } from "lucide-react";
import { inviteUrl, shareOrCopy } from "@/lib/share";
import { formatUnits } from "viem";
import { useAccount, useBalance, useSignMessage } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { CUSD_ADDRESS } from "@/lib/wagmi";
import { supabase } from "@/lib/supabase";
import { useSettings, AVATAR_HEX } from "@/lib/settings";
import { useProgress } from "@/lib/progress";
import { useProfile, createProfile, setProfile } from "@/lib/profile";
import { Avatar } from "@/components/Avatar";
import { SendFunds } from "@/components/SendFunds";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { PlayerCard } from "@/components/PlayerCard";
import { GoodIdCard } from "@/components/GoodIdCard";
import { symbolForToken } from "@/lib/tokens";
import { ProgressCard } from "@/components/Daily";
import { Achievements } from "@/components/Achievements";
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
  const { data: bal } = useBalance({ address, token: CUSD_ADDRESS, query: { enabled: !!address } });
  const [settings] = useSettings();
  const [sendOpen, setSendOpen] = useState(false);
  const [rows, setRows] = useState<MatchRow[] | null>(null);
  const prog = useProgress();
  const { hasProfile, loading: profileLoading } = useProfile();
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
  const displayName = settings.name || short(address);

  if (!isConnected || !address) {
    return (
      <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <div className="mt-6 rounded-2xl border border-line bg-void-700 p-8 text-center shadow-card">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-void-600 text-teal">
            <Wallet className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm text-ink-dim">
            Sign in to see your record, net winnings and match history. Email or Google works — a wallet is created for you.
          </p>
          <button
            onClick={() => login()}
            className="btn-primary mt-5 w-full rounded-xl py-3 text-sm shadow-glow"
          >
            Sign in
          </button>
        </div>

        <div className="mt-4">
          <ProgressCard />
        </div>
      </section>
    );
  }

  const amount = bal ? Number(bal.formatted) : 0;

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-2">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-3.5"
      >
        <Avatar
          image={settings.avatarImage || undefined}
          color={avatarHex}
          name={settings.name || address.slice(2, 4)}
          size={56}
          rounded="rounded-2xl"
        />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">{displayName}</h1>
          <CopyAddress address={address} />
        </div>
        <div className="ml-auto flex flex-col items-end gap-1.5">
          <div className="text-right">
            <AnimatedNumber value={amount} decimals={2} className="text-lg font-semibold text-ink" />
            <p className="text-[11px] text-ink-faint">USDm balance</p>
          </div>
          <button
            onClick={() => setSendOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-void-700 px-3 py-1.5 text-[12px] font-medium text-ink-dim transition-colors hover:border-line-strong hover:text-ink"
          >
            <Send className="h-3.5 w-3.5" /> Withdraw
          </button>
        </div>
      </motion.div>

      {sendOpen && <SendFunds address={address} onClose={() => setSendOpen(false)} />}

      <div className="mt-5">
        <PlayerCard />
      </div>

      <GoodIdCard />

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
        <InviteCard address={address} />
      </div>

      <Achievements />

      <h2 className="mb-3 mt-7 text-[15px] font-semibold tracking-tight">Recent matches</h2>

      {rows === null && supabase ? (
        <p className="rounded-2xl border border-line bg-void-700 px-4 py-6 text-center text-sm text-ink-faint">Loading…</p>
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

function InviteCard({ address }: { address: string }) {
  const url = inviteUrl(address);
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border border-line bg-void-700 p-5 shadow-card">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-ink">Invite friends</p>
        <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-semibold text-amber">BONUSES SOON</span>
      </div>
      <p className="mt-0.5 text-[12px] text-ink-dim">
        Share your link and challenge friends to a staked 1v1. Soon: you both earn USDm when they play their first
        staked match, paid from an on chain rewards vault.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 truncate rounded-xl border border-line bg-void-800 px-3 py-2.5 text-[12px] text-ink-dim">
          {url.replace(/^https?:\/\//, "")}
        </div>
        <button
          onClick={async () => {
            const r = await shareOrCopy({ title: "Gambit", text: "Play classic games and stake USDm on Gambit", url });
            if (r === "copied") {
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }
          }}
          className="btn-primary flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm shadow-glow"
        >
          {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          {copied ? "Copied" : "Share"}
        </button>
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
            Sign once (free, no gas) to save your name, photo and streak to this wallet — synced across devices.
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
