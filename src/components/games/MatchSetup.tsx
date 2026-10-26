"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, Swords, Wallet, Loader2, ShieldCheck, Copy, Check, AlertTriangle, HelpCircle, Share2, Clock } from "lucide-react";
import Link from "next/link";
import { StakeRules } from "./StakeRules";
import { useAccount, useSwitchChain, useSignMessage, useBalance } from "wagmi";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useAllowedTokens } from "@/hooks/useAllowedTokens";
import { useStableBalances } from "@/hooks/useStableBalances";
import { useOpenRooms } from "@/hooks/useOpenRooms";
import { Game } from "@/lib/games";
import { GameArt } from "@/components/art/TileArt";
import { Difficulty, DIFFICULTIES, SUPPORTS_DIFFICULTY } from "@/lib/difficulty";
import { useStakeMatch, useMatchState } from "@/hooks/useStakeMatch";
import { hasToken, signIn } from "@/lib/profile";
import { registerMatch, joinServerMatch } from "@/lib/matchClient";
import { useProfiles, displayName } from "@/lib/profiles";
import { ShareButton } from "@/components/ShareButton";
import { buttonClass } from "@/components/ui/Button";
import { ACTIVE_CHAIN_ID } from "@/lib/wagmi";
import { GAME_TYPE } from "@/lib/escrow";
import { StakeToken, symbolForToken } from "@/lib/tokens";
import { formatUnits } from "viem";
import { cn } from "@/lib/cn";

const FEE = 0.05;

type Mode = "free" | "staked";

export function MatchSetup({
  game,
  initialMode = "free",
  onStart,
}: {
  game: Game;
  initialMode?: Mode;
  /** `fresh` is a match that just filled, as opposed to one being resumed */
  onStart: (difficulty: Difficulty, stake?: { matchId: bigint; you: `0x${string}` }, fresh?: boolean) => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesSeen, setRulesSeen] = useState(false);
  const [stake, setStake] = useState<number>(game.minStake);
  const [custom, setCustom] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [joinId, setJoinId] = useState("");
  const [copied, setCopied] = useState(false);
  const { address, isConnected } = useAccount();
  const { canSignIn, signIn: signInWallet } = useWalletAuth();
  const { switchChain } = useSwitchChain();
  const { createMatch, joinMatch, cancelMatch, step, error, matchId, ready, onActiveChain, reset } = useStakeMatch();
  const [cancelling, setCancelling] = useState(false);
  const { signMessageAsync } = useSignMessage();
  const [authed, setAuthed] = useState(false);

  // Which tokens the escrow actually accepts, and what this player holds. Both
  // read live: a token the contract rejects must never reach the picker (the
  // player would pay gas on the approve and then watch the stake revert), and
  // the default should be the stablecoin they already have money in.
  const { tokens } = useAllowedTokens();
  const { balances, preferred } = useStableBalances(address);
  // null = "nobody has chosen yet", so the live default below can still apply
  const [picked, setPicked] = useState<StakeToken | null>(null);
  const preferredAllowed = tokens.find((t) => t.address === preferred?.token.address);
  const token = picked && tokens.some((t) => t.address === picked.address) ? picked : preferredAllowed ?? tokens[0];

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

  // the joiner normally starts the match; if their call never landed, the
  // creator's screen does it as soon as the escrow shows both seats filled.
  // Either way the creator goes straight to the table.
  useEffect(() => {
    if (!opponentJoined || matchId === null) return;
    void joinServerMatch(matchId).catch(() => undefined);
    if (address) onStart(difficulty, { matchId, you: address }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opponentJoined, matchId]);

  // A room someone is about to join is priced by the escrow, not by the link
  // that brought them here, so read its real entry and show exactly that.
  const { data: joinRoom } = useMatchState(joinId ? BigInt(joinId) : undefined);
  const room = useMemo(() => {
    if (!joinRoom) return null;
    const t = joinRoom as readonly unknown[];
    const status = Number(t[9]);
    const tok = tokens.find((x) => x.address.toLowerCase() === String(t[0]).toLowerCase()) ?? null;
    const entry = tok ? Number(formatUnits(BigInt(t[2] as bigint), tok.decimals)) : 0;
    return { status, tok, entry, creator: String(t[1]).toLowerCase(), deadline: Number(t[4]) * 1000 };
  }, [joinRoom, tokens]);
  useEffect(() => {
    if (!room?.tok) return;
    setPicked(room.tok);
    setStake(room.entry);
    setCustom("");
  }, [room?.tok, room?.entry]);

  // Deep-link from the lobby: /play/<slug>?room=<id>&stake=<cusd> → prefill join.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    const s = params.get("stake");
    const tok = params.get("token");
    // one-tap entries from the home screen
    if (params.get("practice") === "1" && !roomParam) {
      // consumed once, so coming back to this screen doesn't restart practice
      window.history.replaceState(null, "", window.location.pathname);
      onStart(difficulty);
      return;
    }
    if (params.get("mode") === "staked") setMode("staked");
    if (roomParam) {
      setMode("staked");
      setJoinId(roomParam.replace(/\D/g, ""));
    }
    if (tok) {
      const found = tokens.find((t) => t.address.toLowerCase() === tok.toLowerCase());
      if (found) setPicked(found);
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
    const roomParam = new URLSearchParams(window.location.search).get("room");
    if (!roomParam) return;
    let live = true;
    (async () => {
      const { supabase } = await import("@/lib/supabase");
      if (!supabase) return;
      const { data: m } = await supabase
        .from("matches")
        .select("id,status,creator,opponent")
        .eq("id", Number(roomParam))
        .maybeSingle();
      if (!live || !m) return;
      const me = address.toLowerCase();
      const seated = [m.creator, m.opponent].some((a: string | null) => a?.toLowerCase() === me);
      if (seated && (m.status === "active" || m.status === "settling" || m.status === "settled")) {
        setResuming(true);
        onStart(difficulty, { matchId: BigInt(roomParam), you: address });
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // people already waiting in this game: join them before opening yet another room
  const { rooms } = useOpenRooms(`rooms-${game.slug}`);
  const me = address?.toLowerCase();
  const waiting = (rooms ?? []).filter((r) => r.game === game.slug && r.creator?.toLowerCase() !== me).slice(0, 4);
  const profiles = useProfiles(waiting.map((r) => r.creator).concat(room?.creator ? [room.creator] : []));

  const join = async () => {
    if (!joinId) return;
    const ok = await joinMatch(BigInt(joinId), stake, token);
    if (ok && address) {
      try {
        await joinServerMatch(BigInt(joinId));
      } catch {
        /* the creator's screen starts it too once it sees the seat filled */
      }
      onStart(difficulty, { matchId: BigInt(joinId), you: address }, true);
    }
  };

  const create = async () => {
    const id = await createMatch(stake, GAME_TYPE[game.slug] ?? 0, 2, token);
    if (id !== null && address) {
      try {
        await registerMatch({ id, game: game.slug, chainId: ACTIVE_CHAIN_ID, creator: address });
      } catch {
        /* the room still refunds on-chain once its join window lapses */
      }
    }
  };

  // what stands between this player and staking, in order
  const gate = !isConnected ? (
    canSignIn ? (
      <button onClick={signInWallet} className={buttonClass("primary", "lg", "w-full")}>
        <Wallet className="h-4 w-4" /> Connect to play for money
      </button>
    ) : (
      // MiniPay connects on its own; asking would be a dead button
      <div className="glass flex h-[54px] w-full items-center justify-center gap-2 rounded-full text-sm text-ink-dim">
        <Loader2 className="h-4 w-4 animate-spin" /> Connecting your wallet…
      </div>
    )
  ) : !onActiveChain ? (
    <button
      onClick={() => switchChain({ chainId: ACTIVE_CHAIN_ID })}
      className="pressable flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-amber text-[16px] font-bold text-void"
    >
      <AlertTriangle className="h-4 w-4" /> Switch network to play
    </button>
  ) : !authed ? (
    <div>
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
        className={buttonClass("primary", "lg", "w-full")}
      >
        <ShieldCheck className="h-4 w-4" /> Sign in to play (free, no network fee)
      </button>
      <p className="mt-2 text-center text-[12px] text-ink-faint">One free signature proves it&apos;s you, so only you can play your moves.</p>
    </div>
  ) : null;

  const joinDeadline = created ? Number((created as readonly unknown[])[4]) * 1000 : 0;

  return (
    <div className="mx-auto w-full max-w-2xl pb-14">
      <div className="relative">
        <div
          className="relative h-[240px] overflow-hidden"
          style={{ maskImage: "linear-gradient(180deg, #000 60%, transparent)", WebkitMaskImage: "linear-gradient(180deg, #000 60%, transparent)" }}
        >
          <GameArt slug={game.slug} className="relative h-full w-full" />
        </div>
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[calc(12px+env(safe-area-inset-top))]">
          <Link href="/" data-nav="back" aria-label="Back to games" className="glass pressable grid h-11 w-11 place-items-center rounded-full text-ink">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {resuming && (
            <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold text-teal">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Resuming your match
            </span>
          )}
        </div>
        <div className="enter relative -mt-6 px-5">
          <h1 className="display text-[38px] font-extrabold leading-none text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]">{game.name}</h1>
          <p className="mt-1.5 text-[14px] font-medium text-ink-dim">{game.tagline}</p>
        </div>
      </div>

      <div className="px-5">
        {/* Mode toggle */}
        <div className="glass mt-5 grid grid-cols-2 gap-1 rounded-full p-1">
          {(
            [
              { id: "free", label: "Practice free", icon: Bot },
              { id: "staked", label: "Play for money", icon: Swords },
            ] as const
          ).map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button key={m.id} onClick={() => setMode(m.id)} className="relative flex h-11 items-center justify-center gap-2 rounded-full text-[14px] font-semibold">
                {active && (
                  <motion.span
                    layoutId="modePill"
                    className="absolute inset-0 rounded-full border border-teal/30"
                    style={{ background: "linear-gradient(180deg, rgba(62,224,155,0.22), rgba(62,224,155,0.07))", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)" }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon className={cn("relative h-4 w-4", active ? "text-teal" : "text-ink-faint")} />
                <span className={cn("relative", active ? "text-ink" : "text-ink-faint")}>{m.label}</span>
              </button>
            );
          })}
        </div>

        {mode === "free" ? (
          <div key="free" className="enter mt-5">
            <p className="text-[14px] leading-relaxed text-ink-dim">Against the computer. No wallet, no money, just the game.</p>

            {hasDifficulty && (
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {DIFFICULTIES.map((d, i) => {
                  const active = difficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id)}
                      className={cn(
                        "pressable rounded-[20px] px-3 py-3.5 text-left transition-shadow",
                        active ? "border border-teal/50 bg-teal/[0.1] shadow-[0_0_24px_-8px_rgba(62,224,155,0.6)]" : "glass"
                      )}
                    >
                      <p className={cn("display text-[17px] font-bold", active ? "text-ink" : "text-ink-dim")}>{d.label}</p>
                      <span className="mt-1.5 flex gap-1">
                        {[0, 1, 2].map((p) => (
                          <span key={p} className={cn("h-1.5 w-4 rounded-full", p <= i ? (active ? "bg-teal" : "bg-ink-faint") : "bg-white/10")} />
                        ))}
                      </span>
                      <p className="mt-2 text-[11px] leading-tight text-ink-faint">{d.blurb}</p>
                    </button>
                  );
                })}
              </div>
            )}

            <button onClick={() => onStart(difficulty)} className={buttonClass("primary", "lg", "mt-5 w-full")}>
              Start practice
            </button>
          </div>
        ) : (
          <div key="staked" className="enter mt-5">
            <StakeRules game={game} open={rulesOpen} onClose={() => setRulesOpen(false)} />

            {matchId ? (
              // room created: share it, count down the join window, or refund
              <div className="panel rounded-[28px] p-5 text-center">
                {opponentJoined ? (
                  <>
                    <p className="display text-[26px] font-extrabold text-teal">Opponent joined</p>
                    <p className="mt-1 text-[14px] text-ink-dim">Your match is live.</p>
                    <button onClick={() => onStart(difficulty, matchId && address ? { matchId, you: address } : undefined, true)} className={buttonClass("primary", "lg", "mt-4 w-full")}>
                      Start match
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-faint">Your room is open</p>
                    <p className="nums display mt-1 text-[34px] font-extrabold text-ink">
                      {stake.toFixed(2)} <span className="text-[18px] text-ink-dim">{token.symbol}</span>
                    </p>
                    <p className="text-[13px] text-ink-dim">
                      Winner takes <span className="text-glow font-bold">{payout.toFixed(2)} {token.symbol}</span>
                    </p>
                    {joinDeadline > 0 && <Countdown until={joinDeadline} />}
                    <ShareButton
                      text={`I just put ${stake} ${token.symbol} on ${game.name}. Think you can beat me? Tap my link and join.`}
                      url={`${typeof window !== "undefined" ? window.location.origin : "https://www.bestgambit.live"}/play/${game.slug}?room=${matchId.toString()}&stake=${stake}&token=${token.address}`}
                      className={buttonClass("primary", "lg", "mt-4 w-full")}
                    >
                      <Share2 className="h-4 w-4" /> Challenge a friend
                    </ShareButton>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(matchId.toString());
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="nums mx-auto mt-3 flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[14px] font-semibold text-ink-dim"
                    >
                      Room #{matchId.toString()}
                      {copied ? <Check className="h-4 w-4 text-teal" /> : <Copy className="h-4 w-4 text-ink-faint" />}
                    </button>
                    <p className="mt-1 flex items-center justify-center gap-1.5 text-[12px] text-ink-faint">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for someone to join
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
                      className="mx-auto mt-4 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-ink-faint transition-colors hover:text-rose disabled:opacity-60"
                    >
                      {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Cancel room and refund my stake
                    </button>
                  </>
                )}
              </div>
            ) : joinId && room && room.status === 1 ? (
              // joining a specific room, priced by the escrow
              <div className="panel rounded-[28px] p-5">
                <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                  Room #{joinId} · {displayName(room.creator, profiles[room.creator])}
                </p>
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <p className="text-[13px] text-ink-dim">Entry</p>
                    <p className="nums display text-[30px] font-extrabold leading-none text-ink">
                      {room.entry.toFixed(2)} <span className="text-[16px] text-ink-dim">{room.tok?.symbol}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] text-ink-dim">Winner takes</p>
                    <p className="nums display text-glow text-[30px] font-extrabold leading-none">{(room.entry * 2 * (1 - FEE)).toFixed(2)}</p>
                  </div>
                </div>
                {room.deadline > 0 && <Countdown until={room.deadline} />}
                <div className="mt-4">
                  {gate ?? (
                    <button onClick={join} disabled={busy} className={buttonClass("primary", "lg", "w-full")}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
                      {step === "approving" ? `Approving ${room.tok?.symbol ?? ""}…` : step === "joining" ? "Joining…" : "Join and play"}
                    </button>
                  )}
                </div>
                <button onClick={() => setJoinId("")} className="mx-auto mt-3 block text-[13px] font-semibold text-ink-faint">
                  Open my own room instead
                </button>
              </div>
            ) : (
              <>
                {waiting.length > 0 && (
                  <div className="mb-5">
                    <p className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-dim">
                      <span className="h-2 w-2 rounded-full bg-teal shadow-[0_0_10px_rgba(62,224,155,0.9)]" /> Waiting for an opponent
                    </p>
                    <ul className="space-y-2">
                      {waiting.map((r) => {
                        const v = Number(formatUnits(BigInt(r.stake || "0"), r.decimals ?? 18));
                        return (
                          <li key={r.id}>
                            <button onClick={() => setJoinId(String(r.id))} className="glass pressable flex w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[14px] font-semibold text-ink">{displayName(r.creator, profiles[r.creator.toLowerCase()])}</p>
                                <p className="text-[12px] text-ink-faint">Room #{r.id}</p>
                              </div>
                              <span className="nums text-[15px] font-bold text-teal">
                                {v.toFixed(2)} {symbolForToken(r.token)}
                              </span>
                              <span className={buttonClass("primary", "sm", "px-3.5")}>Join</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-dim">Or open your own room</p>
                  </div>
                )}

                {tokens.length > 1 && (
                  <div className="mb-4 grid grid-cols-3 gap-2">
                    {tokens.map((t) => {
                      const held = balances.find((b) => b.token.address === t.address)?.amount ?? 0;
                      const on = token.address === t.address;
                      return (
                        <button
                          key={t.address}
                          onClick={() => setPicked(t)}
                          className={cn("pressable rounded-[18px] px-2 py-2.5 text-center", on ? "border border-teal/50 bg-teal/[0.1]" : "glass")}
                        >
                          <span className={cn("block text-[15px] font-bold", on ? "text-ink" : "text-ink-dim")}>{t.symbol}</span>
                          {/* what they hold, so picking a token they have no money
                              in is an obvious mistake rather than a silent one */}
                          <span className="nums mt-0.5 block text-[11px] font-medium text-ink-faint">{held.toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-dim">
                    Your entry
                    {tokenBal ? <span className="ml-1.5 normal-case tracking-normal text-ink-faint">· you have {Number(tokenBal.formatted).toFixed(2)} {token.symbol}</span> : null}
                  </p>
                  <button onClick={() => setRulesOpen(true)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-teal">
                    <HelpCircle className="h-3.5 w-3.5" /> Rules
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {chips.map((v) => {
                    const on = !custom && stake === v;
                    return (
                      <button
                        key={v}
                        onClick={() => {
                          setStake(v);
                          setCustom("");
                        }}
                        className={cn("nums pressable h-12 rounded-[16px] text-[15px] font-bold", on ? "border border-teal/50 bg-teal/[0.12] text-ink shadow-[0_0_20px_-8px_rgba(62,224,155,0.7)]" : "glass text-ink-dim")}
                      >
                        {v < 1 ? v.toFixed(2) : v}
                      </button>
                    );
                  })}
                </div>

                <div className={cn("glass mt-2 flex items-center gap-2 rounded-[16px] px-4 py-3", custom && "border-teal/50")}>
                  <span className="whitespace-nowrap text-[13px] text-ink-faint">Other amount</span>
                  <input
                    value={custom}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.]/g, "");
                      setCustom(raw);
                      const n = parseFloat(raw);
                      if (Number.isFinite(n)) setStake(n);
                    }}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="nums min-w-0 flex-1 bg-transparent text-right text-[15px] font-bold text-ink outline-none placeholder:text-ink-faint"
                  />
                  <span className="shrink-0 text-[13px] text-ink-faint">{token.symbol}</span>
                </div>
                {custom && !validStake && (
                  <p className="mt-1.5 text-[12px] text-rose">
                    The smallest entry is {game.minStake.toFixed(2)} {token.symbol}.
                  </p>
                )}

                <div
                  className="mt-4 rounded-[24px] border border-teal/20 p-5"
                  style={{ background: "radial-gradient(120% 120% at 100% 0%, rgba(62,224,155,0.16), rgba(0,0,0,0) 60%), linear-gradient(180deg, #121a26, #0b1018)" }}
                >
                  <Row label="You put in" value={`${(validStake ? stake : 0).toFixed(2)} ${token.symbol}`} />
                  <Row label="Your opponent puts in" value={`${(validStake ? stake : 0).toFixed(2)} ${token.symbol}`} />
                  <Row label="Gambit fee" value="5%" muted />
                  <div className="my-3 h-px bg-white/10" />
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-ink">Winner takes</span>
                    <span className="nums display text-glow text-[28px] font-extrabold">
                      {(validStake ? payout : 0).toFixed(2)} <span className="text-[15px]">{token.symbol}</span>
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  {gate ?? (
                    <button onClick={create} disabled={busy || !ready || !validStake} className={buttonClass("primary", "lg", "w-full")}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
                      {step === "approving" ? `Approving ${token.symbol}…` : step === "creating" ? "Opening your room…" : "Open a room"}
                    </button>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value.replace(/\D/g, ""))}
                    placeholder="Got a room number? Enter it"
                    inputMode="numeric"
                    className="glass nums h-11 flex-1 rounded-full px-4 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-teal/50"
                  />
                </div>
              </>
            )}

            {joinId && room && room.status !== 1 && (
              <p className="mt-3 text-center text-[13px] text-rose">
                {room.status === 0 ? "There's no room with that number." : "That room already started or closed."}
              </p>
            )}
            {error && <p className="mt-3 text-center text-[13px] text-rose">{error}</p>}

            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[12px] text-ink-faint">
              <ShieldCheck className="h-3.5 w-3.5" />
              Both entries are locked in a contract and paid out the moment the game ends.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** The join window, counting down, so nobody waits on a room that can't fill. */
function Countdown({ until }: { until: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, until - now);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return (
    <p className={cn("nums mt-3 flex items-center justify-center gap-1.5 text-[13px] font-semibold", left < 60_000 ? "text-rose" : "text-ink-dim")}>
      <Clock className="h-3.5 w-3.5" />
      {left > 0 ? `Open for ${m}:${String(s).padStart(2, "0")}` : "Join window closed"}
    </p>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[14px] text-ink-dim">{label}</span>
      <span className={cn("nums text-[14px] font-semibold", muted ? "text-ink-faint" : "text-ink")}>{value}</span>
    </div>
  );
}
