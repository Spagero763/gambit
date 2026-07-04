"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bot, Swords, Wallet, Loader2, ShieldCheck, Copy, Check, AlertTriangle, HelpCircle, Share2 } from "lucide-react";
import Link from "next/link";
import { StakeRules } from "./StakeRules";
import { useAccount, useSwitchChain, useSignMessage, useBalance } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { Game } from "@/lib/games";
import { GameCover } from "@/components/art/GameCover";
import { Difficulty, DIFFICULTIES, SUPPORTS_DIFFICULTY } from "@/lib/difficulty";
import { useStakeMatch, useMatchState } from "@/hooks/useStakeMatch";
import { hasToken, signIn } from "@/lib/profile";
import { registerMatch, joinServerMatch } from "@/lib/matchClient";
import { shareOrCopy } from "@/lib/share";
import { ACTIVE_CHAIN_ID } from "@/lib/wagmi";
import { tokensFor, StakeToken } from "@/lib/tokens";
import { parseUnits, formatUnits } from "viem";
import { cn } from "@/lib/cn";

const FEE = 0.05;

// Map game slug to the contract gameType byte.
const GAME_TYPE: Record<string, number> = {
  chess: 0,
  "tic-tac-toe": 1,
  snakes: 2,
  whot: 3,
  blocks: 4,
};

type Mode = "free" | "staked";

export function MatchSetup({
  game,
  onStart,
}: {
  game: Game;
  onStart: (difficulty: Difficulty, stake?: { matchId: bigint; you: `0x${string}` }) => void;
}) {
  const [mode, setMode] = useState<Mode>("free");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesSeen, setRulesSeen] = useState(false);
  const [stake, setStake] = useState<number>(game.minStake);
  const [custom, setCustom] = useState("");
  const tokens = tokensFor(ACTIVE_CHAIN_ID);
  const [token, setToken] = useState<StakeToken>(tokens[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [joinId, setJoinId] = useState("");
  const [copied, setCopied] = useState(false);
  const [invited, setInvited] = useState<"idle" | "shared" | "copied">("idle");
  const { address, isConnected } = useAccount();
  const { login } = usePrivy();
  const { switchChain } = useSwitchChain();
  const { createMatch, joinMatch, cancelMatch, step, error, matchId, ready, onActiveChain, reset } = useStakeMatch();
  const [cancelling, setCancelling] = useState(false);
  const { signMessageAsync } = useSignMessage();
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    setAuthed(hasToken(address));
  }, [address]);
  // show the rules the first time a player opens the staked tab
  useEffect(() => {
    if (mode === "staked" && !rulesSeen) {
      setRulesOpen(true);
      setRulesSeen(true);
    }
  }, [mode, rulesSeen]);
  const { data: created } = useMatchState(matchId ?? undefined);
  const { data: tokenBal } = useBalance({ address, token: token.address, query: { enabled: !!address } });
  const hasDifficulty = SUPPORTS_DIFFICULTY.has(game.slug);

  const chips = [0.1, 0.5, 1, 2, 5].filter((v) => v >= game.minStake);
  const payout = +(stake * 2 * (1 - FEE)).toFixed(2);
  const validStake = Number.isFinite(stake) && stake >= game.minStake;

  const busy = step === "approving" || step === "creating" || step === "joining";
  // tuple index 9 = status (2 = Active, both seats filled)
  const opponentJoined = created ? Number((created as readonly unknown[])[9]) === 2 : false;

  // Deep-link from the lobby: /play/<slug>?room=<id>&stake=<cusd> → prefill join.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    const s = params.get("stake");
    const tok = params.get("token");
    if (room) {
      setMode("staked");
      setJoinId(room.replace(/\D/g, ""));
    }
    if (tok) {
      const found = tokens.find((t) => t.address.toLowerCase() === tok.toLowerCase());
      if (found) setToken(found);
    }
    if (s) {
      const n = parseFloat(s);
      if (Number.isFinite(n) && n > 0) {
        setStake(n);
        setCustom(s);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // RESUME: if the linked room is a live match I'm already seated in, jump
  // straight back onto the board instead of showing the join form.
  const [resuming, setResuming] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !address) return;
    const room = new URLSearchParams(window.location.search).get("room");
    if (!room) return;
    let live = true;
    (async () => {
      const { supabase } = await import("@/lib/supabase");
      if (!supabase) return;
      const { data: m } = await supabase
        .from("matches")
        .select("id,status,creator,opponent")
        .eq("id", Number(room))
        .maybeSingle();
      if (!live || !m) return;
      const me = address.toLowerCase();
      const seated = [m.creator, m.opponent].some((a: string | null) => a?.toLowerCase() === me);
      if (seated && (m.status === "active" || m.status === "settling" || m.status === "settled")) {
        setResuming(true);
        onStart(difficulty, { matchId: BigInt(room), you: address });
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-5 py-5">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-2 rounded-full glass px-3 py-1.5 text-sm text-ink-dim"
      >
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>
      {resuming && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-teal">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Resuming your match…
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <span className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10">
          <GameCover art={game.art} className="h-full w-full" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">{game.name}</h1>
          <p className="text-sm text-ink-dim">{game.tagline}</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-void-800 p-1">
        {(
          [
            { id: "free", label: "Free play", icon: Bot },
            { id: "staked", label: "Staked 1v1", icon: Swords },
          ] as const
        ).map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className="relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold"
            >
              {active && (
                <motion.span
                  layoutId="modePill"
                  className="absolute inset-0 rounded-xl bg-void-600"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Icon
                className={cn("relative h-4 w-4", active ? "text-ink" : "text-ink-faint")}
              />
              <span className={cn("relative", active ? "text-ink" : "text-ink-faint")}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {mode === "free" ? (
          <motion.div
            key="free"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6"
          >
            <div className="rounded-3xl glass p-5 shadow-card">
              <p className="text-sm leading-relaxed text-ink-dim">
                Play against the bot. No wallet needed, no stake, just the
                board. See how the game feels, then switch to staked when you
                want to put USDm on the line.
              </p>
            </div>

            {hasDifficulty && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Difficulty
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTIES.map((d) => {
                    const active = difficulty === d.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() => setDifficulty(d.id)}
                        className={cn(
                          "rounded-2xl px-3 py-3 text-left transition-all",
                          active ? "glass ring-1 ring-white/25" : "bg-white/[0.03]"
                        )}
                      >
                        <p className={cn("text-sm font-bold", active ? "text-ink" : "text-ink-dim")}>
                          {d.label}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-tight text-ink-faint">{d.blurb}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => onStart(difficulty)}
              className="btn-primary mt-4 w-full rounded-2xl py-3.5 text-sm shadow-glow"
            >
              Start match
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="staked"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6"
          >
            <StakeRules game={game} open={rulesOpen} onClose={() => setRulesOpen(false)} />

            {tokens.length > 1 && (
              <div className="mb-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Token</p>
                <div className="grid grid-cols-2 gap-2">
                  {tokens.map((t) => (
                    <button
                      key={t.address}
                      onClick={() => setToken(t)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                        token.address === t.address ? "border-teal/50 bg-teal/[0.1] text-ink" : "border-line bg-void-800 text-ink-dim hover:text-ink"
                      )}
                    >
                      {t.symbol}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Your stake{tokenBal ? <span className="ml-1.5 normal-case text-ink-faint">· bal {Number(tokenBal.formatted).toFixed(2)} {token.symbol}</span> : null}
              </p>
              <button
                onClick={() => setRulesOpen(true)}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-teal transition-opacity hover:opacity-80"
              >
                <HelpCircle className="h-3.5 w-3.5" /> How it works
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {chips.map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setStake(v);
                    setCustom("");
                  }}
                  className={cn(
                    "nums rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                    !custom && stake === v
                      ? "border-teal/50 bg-teal/[0.1] text-ink"
                      : "border-line bg-void-800 text-ink-dim hover:text-ink"
                  )}
                >
                  {v.toFixed(2)}
                </button>
              ))}
            </div>

            {/* custom amount */}
            <div
              className={cn(
                "mt-2 flex items-center gap-2 rounded-xl border bg-void-800 px-3 py-2 transition-colors",
                custom ? "border-teal/50" : "border-line"
              )}
            >
              <span className="text-xs text-ink-faint">Custom</span>
              <input
                value={custom}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, "");
                  setCustom(raw);
                  const n = parseFloat(raw);
                  if (Number.isFinite(n)) setStake(n);
                }}
                inputMode="decimal"
                placeholder="Enter amount"
                className="nums flex-1 bg-transparent text-right text-sm font-semibold text-ink outline-none placeholder:text-ink-faint"
              />
              <span className="text-xs text-ink-faint">{token.symbol}</span>
            </div>
            {custom && !validStake && (
              <p className="mt-1.5 text-[11px] text-rose">
                Minimum stake is {game.minStake.toFixed(2)} {token.symbol}.
              </p>
            )}

            <div className="mt-4 rounded-3xl border border-line bg-void-700 p-5 shadow-card">
              <Row label="Your stake" value={`${(validStake ? stake : 0).toFixed(2)} ${token.symbol}`} />
              <Row label="Opponent matches" value={`${(validStake ? stake : 0).toFixed(2)} ${token.symbol}`} />
              <Row label="Protocol fee" value="5%" muted />
              <div className="my-3 h-px bg-line" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-dim">Winner takes</span>
                <span className="nums text-xl font-bold text-teal">
                  {(validStake ? payout : 0).toFixed(2)} {token.symbol}
                </span>
              </div>
            </div>

            {!isConnected ? (
              <button
                onClick={() => login()}
                className="btn-primary mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm shadow-glow"
              >
                <Wallet className="h-4 w-4" /> Connect to stake
              </button>
            ) : !onActiveChain ? (
              <button
                onClick={() => switchChain({ chainId: ACTIVE_CHAIN_ID })}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber py-3.5 text-sm font-semibold text-void transition-opacity hover:opacity-90"
              >
                <AlertTriangle className="h-4 w-4" /> Switch network to play
              </button>
            ) : !authed ? (
              <div className="mt-4">
                <button
                  onClick={async () => {
                    if (!address) return;
                    try {
                      await signIn(address, (a) => signMessageAsync({ message: a.message }));
                      setAuthed(true);
                    } catch {
                      /* user rejected or failed; button stays */
                    }
                  }}
                  className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm shadow-glow"
                >
                  <ShieldCheck className="h-4 w-4" /> Sign in to stake (free, no gas)
                </button>
                <p className="mt-2 text-center text-[11px] text-ink-faint">
                  One free signature proves it&apos;s you, so only you can play your moves.
                </p>
              </div>
            ) : matchId ? (
              // room created: show id to share + opponent status
              <div className="mt-4 rounded-2xl border border-line bg-void-700 p-4 text-center shadow-card">
                {opponentJoined ? (
                  <>
                    <p className="text-sm font-semibold text-teal">Opponent joined</p>
                    <button
                      onClick={() => onStart(difficulty, matchId && address ? { matchId, you: address } : undefined)}
                      className="btn-primary mt-3 w-full rounded-xl py-3 text-sm shadow-glow"
                    >
                      Start match
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-ink-faint">Room created. Share this ID with your opponent.</p>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(matchId.toString());
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="nums mx-auto mt-2 flex items-center gap-2 rounded-lg border border-line bg-void-800 px-4 py-2 font-mono text-lg font-semibold text-ink"
                    >
                      #{matchId.toString()}
                      {copied ? <Check className="h-4 w-4 text-teal" /> : <Copy className="h-4 w-4 text-ink-faint" />}
                    </button>
                    {/* the challenge link: drops your friend straight on the
                        prefilled join screen — bring your own opponent */}
                    <button
                      onClick={async () => {
                        const url = `${window.location.origin}/play/${game.slug}?room=${matchId.toString()}&stake=${stake}&token=${token.address}`;
                        const r = await shareOrCopy({
                          title: "Gambit challenge",
                          text: `⚔️ I put ${stake} ${token.symbol} on ${game.name}. Join my room and let's settle it.`,
                          url,
                        });
                        if (r !== "failed") setInvited(r);
                        setTimeout(() => setInvited("idle"), 2000);
                      }}
                      className="btn-primary mx-auto mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] shadow-glow"
                    >
                      {invited === "idle" ? <Share2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      {invited === "copied" ? "Link copied!" : invited === "shared" ? "Challenge sent!" : "Challenge a friend"}
                    </button>
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink-faint">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for opponent to join
                    </p>
                    <button
                      onClick={async () => {
                        if (!matchId) return;
                        setCancelling(true);
                        const ok = await cancelMatch(matchId);
                        setCancelling(false);
                        if (ok) reset();
                      }}
                      disabled={cancelling}
                      className="mx-auto mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-line bg-void-800 px-3 py-1.5 text-[12px] font-medium text-ink-dim transition-colors hover:text-rose disabled:opacity-60"
                    >
                      {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Cancel room &amp; refund my stake
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <button
                  onClick={async () => {
                    const id = await createMatch(stake, GAME_TYPE[game.slug] ?? 0, 2, token);
                    if (id !== null && address) {
                      try {
                        await registerMatch({
                          id,
                          game: game.slug,
                          chainId: ACTIVE_CHAIN_ID,
                          stake: parseUnits(stake.toString(), token.decimals),
                          creator: address,
                          token: token.address,
                          decimals: token.decimals,
                        });
                      } catch {
                        /* registration retried server-side on join */
                      }
                    }
                  }}
                  disabled={busy || !ready || !validStake}
                  className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm shadow-glow disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
                  {step === "approving" ? `Approving ${token.symbol}…` : step === "creating" ? "Creating room…" : "Create staked room"}
                </button>

                <div className="flex items-center gap-2">
                  <input
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value.replace(/\D/g, ""))}
                    placeholder="Join by room ID"
                    inputMode="numeric"
                    className="nums flex-1 rounded-xl border border-line bg-void-800 px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-teal/50"
                  />
                  <button
                    onClick={async () => {
                      if (!joinId) return;
                      const ok = await joinMatch(BigInt(joinId), stake, token);
                      if (ok && address) {
                        try {
                          await joinServerMatch(BigInt(joinId), address);
                        } catch {
                          /* server will reconcile on first move */
                        }
                        onStart(difficulty, { matchId: BigInt(joinId), you: address });
                      }
                    }}
                    disabled={busy || !joinId}
                    className="rounded-xl border border-line bg-void-600 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-void-600/70 disabled:opacity-50"
                  >
                    {step === "joining" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="mt-2 text-center text-[11px] text-rose">{error}</p>}

            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-faint">
              <ShieldCheck className="h-3.5 w-3.5" />
              Stakes are held in escrow and paid out on-chain at match end.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-ink-dim">{label}</span>
      <span className={cn("text-sm font-medium", muted ? "text-ink-faint" : "text-ink")}>
        {value}
      </span>
    </div>
  );
}
