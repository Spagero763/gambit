"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Users, Loader2, Wallet, ShieldCheck, AlertTriangle, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useSwitchChain, useSignMessage } from "wagmi";
import { injected } from "wagmi/connectors";
import { parseUnits, formatUnits } from "viem";
import { useStakeMatch } from "@/hooks/useStakeMatch";
import { ACTIVE_CHAIN_ID } from "@/lib/wagmi";
import { tokensFor, StakeToken, symbolForToken, decimalsForToken } from "@/lib/tokens";
import { hasToken, signIn } from "@/lib/profile";
import { registerTournament, listTournaments, TournamentRow } from "@/lib/tournamentClient";
import { cn } from "@/lib/cn";

const FEE = 0.05;
const CAPS = [3, 4, 5, 6, 7, 8];

// Cup types: Block Blitz is a score race (3-8 players, same board); the 1v1
// games run as real knockouts — semi-finals, bronze match and final (4 players).
const CUP_GAMES = [
  { slug: "blocks", name: "Block Blitz", gameType: 4, format: "score" as const },
  { slug: "chess", name: "Chess", gameType: 0, format: "bracket" as const },
  { slug: "whot", name: "Naija Whot", gameType: 3, format: "bracket" as const },
  { slug: "tic-tac-toe", name: "Tic-Tac-Toe", gameType: 1, format: "bracket" as const },
  { slug: "snakes", name: "Snakes & Ladders", gameType: 2, format: "bracket" as const },
];

const STATUS_STYLE: Record<string, string> = {
  open: "bg-teal/15 text-teal",
  active: "bg-amber/15 text-amber",
  settling: "bg-amber/15 text-amber",
  settled: "bg-white/10 text-ink-dim",
  cancelled: "bg-rose/15 text-rose",
};

export function Tournaments() {
  const router = useRouter();
  const tokens = tokensFor(ACTIVE_CHAIN_ID);
  const [token, setToken] = useState<StakeToken>(tokens[0]);
  const [stake, setStake] = useState(0.5);
  const [custom, setCustom] = useState("");
  const [cupGame, setCupGame] = useState(CUP_GAMES[0]);
  const [capacity, setCapacity] = useState(4);
  const [bracketSeats, setBracketSeats] = useState<4 | 8>(4);
  const isBracket = cupGame.format === "bracket";
  const seats = isBracket ? bracketSeats : capacity; // knockouts: powers of two
  const [rows, setRows] = useState<TournamentRow[] | null>(null);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { switchChain } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const { createMatch, step, error, ready, onActiveChain } = useStakeMatch();
  const [authed, setAuthed] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => setAuthed(hasToken(address)), [address]);

  const refresh = useCallback(async () => {
    try {
      setRows(await listTournaments());
    } catch {
      setRows([]);
    }
  }, []);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, [refresh]);

  const validStake = Number.isFinite(stake) && stake > 0;
  const pot = stake * seats * (1 - FEE);
  const busy = creating || step === "approving" || step === "creating";

  const create = async () => {
    if (!address || !validStake) return;
    setCreating(true);
    try {
      const id = await createMatch(stake, cupGame.gameType, seats, token);
      if (id !== null) {
        // The stake is already escrowed on-chain, so registration MUST land —
        // retry transient blips, then navigate to the room regardless (it can
        // recover/cancel from the on-chain match even if the row is missing).
        const args = {
          id,
          game: cupGame.slug,
          format: cupGame.format,
          chainId: ACTIVE_CHAIN_ID,
          stake: parseUnits(stake.toString(), token.decimals),
          capacity: seats,
          creator: address,
          token: token.address,
          decimals: token.decimals,
        };
        let registered = false;
        for (let i = 0; i < 3 && !registered; i++) {
          try { await registerTournament(args); registered = true; } catch { await new Promise((r) => setTimeout(r, 800)); }
        }
        router.push(`/tournament/${id.toString()}`);
      }
    } catch {
      /* error surfaced below; stay on page */
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber/15 text-amber">
          <Trophy className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">Tournaments</h1>
          <p className="text-sm text-ink-dim">Knockout rounds — survive the cuts to the final. Top 3 split the pot 50/30/20.</p>
        </div>
      </div>

      {/* Create */}
      <div className="mt-6 rounded-3xl glass p-5 shadow-card">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Plus className="h-4 w-4 text-teal" /> Create a tournament</p>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Game</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {CUP_GAMES.map((g) => (
            <button
              key={g.slug}
              onClick={() => setCupGame(g)}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                cupGame.slug === g.slug ? "border-teal/50 bg-teal/[0.1] text-ink" : "border-line bg-void-800 text-ink-dim hover:text-ink"
              )}
            >
              {g.name}
            </button>
          ))}
        </div>
        <p className="mb-3 text-[11px] text-ink-faint">
          {isBracket
            ? "Knockout bracket · 4 players · two semi-finals on separate boards, then the final — losers fight for bronze."
            : "Score race · everyone plays the same board each round, the bottom half is cut until the final three."}
        </p>

        {tokens.length > 1 && (
          <div className="mb-3 grid grid-cols-2 gap-2">
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
        )}

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Stake per player</p>
        <div className="flex flex-wrap gap-2">
          {[0.1, 0.5, 1, 2, 5].map((v) => (
            <button
              key={v}
              onClick={() => { setStake(v); setCustom(""); }}
              className={cn(
                "nums rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                !custom && stake === v ? "border-teal/50 bg-teal/[0.1] text-ink" : "border-line bg-void-800 text-ink-dim hover:text-ink"
              )}
            >
              {v.toFixed(2)}
            </button>
          ))}
          <input
            value={custom}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9.]/g, "");
              setCustom(raw);
              const n = parseFloat(raw);
              if (Number.isFinite(n)) setStake(n);
            }}
            inputMode="decimal"
            placeholder="Custom"
            className="nums w-24 rounded-xl border border-line bg-void-800 px-3 py-2 text-right text-sm font-semibold text-ink outline-none placeholder:text-ink-faint focus:border-teal/50"
          />
        </div>

        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-faint">Players</p>
        {isBracket ? (
          <div>
            <div className="flex gap-2">
              {([4, 8] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setBracketSeats(n)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                    bracketSeats === n ? "border-teal/50 bg-teal/[0.1] text-ink" : "border-line bg-void-800 text-ink-dim hover:text-ink"
                  )}
                >
                  <span className="nums">{n}</span>
                  <span className="ml-1.5 text-[11px] font-medium text-ink-faint">
                    {n === 4 ? "semis → final" : "quarters → semis → final"}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-ink-faint">
              Knockouts need a power of two — odd counts would hand someone a free pass.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {CAPS.map((c) => (
              <button
                key={c}
                onClick={() => setCapacity(c)}
                className={cn(
                  "nums rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                  capacity === c ? "border-teal/50 bg-teal/[0.1] text-ink" : "border-line bg-void-800 text-ink-dim hover:text-ink"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-void-700 px-4 py-3">
          <span className="text-sm text-ink-dim">Prize pool</span>
          <span className="nums text-lg font-bold text-teal">{(validStake ? pot : 0).toFixed(2)} {token.symbol}</span>
        </div>
        <p className="mt-1.5 text-[11px] text-ink-faint">1st {(pot * 0.5).toFixed(2)} · 2nd {(pot * 0.3).toFixed(2)} · 3rd {(pot * 0.2).toFixed(2)} {token.symbol} (after 5% fee)</p>

        {!isConnected ? (
          <button onClick={() => connect({ connector: injected() })} className="btn-primary mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm shadow-glow">
            <Wallet className="h-4 w-4" /> Connect to create
          </button>
        ) : !onActiveChain ? (
          <button onClick={() => switchChain({ chainId: ACTIVE_CHAIN_ID })} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber py-3.5 text-sm font-semibold text-void">
            <AlertTriangle className="h-4 w-4" /> Switch network
          </button>
        ) : !authed ? (
          <button
            onClick={async () => {
              if (!address) return;
              try { await signIn(address, (a) => signMessageAsync({ message: a.message })); setAuthed(true); } catch {}
            }}
            className="btn-primary mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm shadow-glow"
          >
            <ShieldCheck className="h-4 w-4" /> Sign in (free, no gas)
          </button>
        ) : (
          <button onClick={create} disabled={busy || !ready || !validStake} className="btn-primary mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm shadow-glow disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
            {step === "approving" ? `Approving ${token.symbol}…` : step === "creating" ? "Creating…" : `Create & stake ${stake.toFixed(2)} ${token.symbol}`}
          </button>
        )}
        {error && <p className="mt-2 text-center text-[11px] text-rose">{error}</p>}
      </div>

      {/* Open / active list */}
      <div className="mt-7">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Join a tournament</p>
        {rows === null ? (
          <p className="text-sm text-ink-faint">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="rounded-2xl border border-line bg-void-800 px-4 py-6 text-center text-sm text-ink-faint">No open tournaments yet. Create the first one above.</p>
        ) : (
          <div className="space-y-2.5">
            {rows.map((r) => <Card key={r.id} row={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ row }: { row: TournamentRow }) {
  const sym = symbolForToken(row.token);
  const dec = row.decimals ?? decimalsForToken(row.token);
  const stake = Number(formatUnits(BigInt(row.stake), dec));
  const pot = stake * row.capacity * (1 - FEE);
  return (
    <Link href={`/tournament/${row.id}`} className="block">
      <motion.div whileTap={{ scale: 0.99 }} className="flex items-center justify-between rounded-2xl border border-line bg-void-800 px-4 py-3.5 transition-colors hover:border-line-strong">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-bold text-ink">
              {CUP_GAMES.find((g) => g.slug === row.game)?.name ?? row.game}
            </span>
            {row.format === "bracket" && (
              <span className="rounded-full bg-violet/15 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-bright">Knockout</span>
            )}
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", STATUS_STYLE[row.status] ?? "bg-white/10 text-ink-dim")}>{row.status}</span>
          </div>
          <p className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-faint">
            <span className="nums">{stake.toFixed(2)} {sym} entry</span>
            <span>·</span>
            <span className="nums inline-flex items-center gap-1"><Users className="h-3 w-3" /> {row.capacity} max</span>
            <span>·</span>
            <span className="nums text-teal">{pot.toFixed(2)} {sym} pool</span>
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint" />
      </motion.div>
    </Link>
  );
}
