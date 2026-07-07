"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Wallet, Loader2, Fuel, RefreshCw, ExternalLink } from "lucide-react";
import { useAccount, useSignMessage } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { hasToken, signIn, getToken } from "@/lib/profile";
import { ExternalA } from "@/components/ExternalA";
import { cn } from "@/lib/cn";

const OWNER = "0x32a3596c25a98950e850e3531a0aa87f1506e5d7";
const EXPLORER: Record<number, string> = { 42220: "https://celoscan.io/tx/", 11142220: "https://sepolia.celoscan.io/tx/" };

interface Vault {
  address: string | null;
  balance: number;
  low: boolean;
}
interface Status {
  relayer: { address: string; balanceCELO: number; lowGas: boolean } | null;
  vaults: { cup: Vault | null; claims: Vault | null; referral: Vault | null } | null;
  cup?: { address: string; score: number; name: string | null; banned: boolean }[];
  week?: string;
  matches: any[];
  tournaments: any[];
}

export function AdminPanel() {
  const { address, isConnected } = useAccount();
  const { login } = usePrivy();
  const { signMessageAsync } = useSignMessage();
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<Status | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [manualId, setManualId] = useState("");

  const isOwnerWallet = address?.toLowerCase() === OWNER;
  useEffect(() => setAuthed(hasToken(address)), [address]);

  const load = useCallback(async () => {
    if (!isOwnerWallet || !address) return;
    const token = getToken(address);
    const res = await fetch(`/api/admin/status?token=${encodeURIComponent(token ?? "")}`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
    else setData(null);
  }, [isOwnerWallet, address]);

  useEffect(() => {
    if (authed && isOwnerWallet) load();
  }, [authed, isOwnerWallet, load]);

  const act = async (action: string, id: string | number, chainId?: number) => {
    if (!address) return;
    setBusyId(`${action}-${id}`);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: getToken(address), action, id: String(id), chainId }),
      });
      const d = await res.json();
      setMsg(d.ok ? `✓ ${action} #${id} done${d.settleTx ? "" : ""}` : `#${id}: ${d.error ?? "failed"}`);
      await load();
    } catch (e: any) {
      setMsg(e?.message ?? "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  if (!isConnected) {
    return (
      <Center>
        <button onClick={() => login()} className="btn-primary flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm shadow-glow">
          <Wallet className="h-4 w-4" /> Connect owner wallet
        </button>
      </Center>
    );
  }
  if (!isOwnerWallet) {
    return <Center><p className="text-sm text-ink-dim">This wallet isn&apos;t the admin. Switch to the owner wallet ({OWNER.slice(0, 6)}…{OWNER.slice(-4)}).</p></Center>;
  }
  if (!authed) {
    return (
      <Center>
        <button
          onClick={async () => { if (!address) return; try { await signIn(address, (a) => signMessageAsync({ message: a.message })); setAuthed(true); } catch {} }}
          className="btn-primary flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm shadow-glow"
        >
          <ShieldCheck className="h-4 w-4" /> Sign in as admin (free)
        </button>
      </Center>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Admin</h1>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-void-800 px-3 py-1.5 text-[12px] text-ink-dim hover:text-ink">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* relayer gas */}
      <div className={cn("mt-5 flex items-center gap-3 rounded-2xl border p-4", data?.relayer?.lowGas ? "border-rose/40 bg-rose/[0.06]" : "border-teal/30 bg-teal/[0.06]")}>
        <Fuel className={cn("h-5 w-5", data?.relayer?.lowGas ? "text-rose" : "text-teal")} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Relayer gas {data?.relayer ? <span className="nums">· {data.relayer.balanceCELO} CELO</span> : ""}</p>
          <p className="truncate text-[11px] text-ink-faint">{data?.relayer?.address ?? "…"}</p>
        </div>
        {data?.relayer?.lowGas && <span className="rounded-full bg-rose/15 px-2 py-1 text-[10px] font-bold text-rose">LOW — TOP UP</span>}
      </div>

      {/* prize vaults: balances + low warnings + one-tap cup settle */}
      {data?.vaults && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <VaultCard label="Cup" unit="USDm" v={data.vaults.cup} />
          <VaultCard label="Claims" unit="G$" v={data.vaults.claims} />
          <VaultCard label="Referral" unit="USDm" v={data.vaults.referral} />
        </div>
      )}
      <button
        onClick={async () => {
          setBusyId("settleCup");
          setMsg(null);
          try {
            const r = await fetch("/api/cup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "settle" }),
            });
            const d = await r.json();
            setMsg(d.settled ? `✓ cup settled · ${(d.winners ?? []).length} winner(s) paid` : d.error ?? "cup: nothing to settle");
            await load();
          } catch (e: any) {
            setMsg(e?.message ?? "cup settle failed");
          } finally {
            setBusyId(null);
          }
        }}
        disabled={busyId === "settleCup"}
        className="mt-2 w-full rounded-xl border border-line bg-void-800 py-2.5 text-[12px] font-medium text-ink-dim transition-colors hover:text-ink disabled:opacity-60"
      >
        {busyId === "settleCup" ? "Settling last week's cup…" : "Settle last week's cup now"}
      </button>

      {msg && <p className="mt-3 rounded-xl border border-line bg-void-800 px-3 py-2 text-center text-[12px] text-ink-dim">{msg}</p>}

      {/* cup moderation: kick suspicious entries, ban repeat offenders */}
      <Section title={`This week's cup entries (${data?.cup?.length ?? 0})`}>
        {(data?.cup ?? []).map((e) => (
          <Row
            key={e.address}
            title={`${e.name || e.address.slice(0, 8) + "…" + e.address.slice(-4)} · ${e.score.toLocaleString()} pts`}
            sub={`${e.address}${e.banned ? " · BANNED" : ""}`}
          >
            <Btn busy={busyId === `removeCupEntry-${e.address}`} onClick={() => act("removeCupEntry", e.address)} tone="rose">
              Remove entry
            </Btn>
            {e.banned ? (
              <Btn busy={busyId === `unbanWallet-${e.address}`} onClick={() => act("unbanWallet", e.address)}>Unban</Btn>
            ) : (
              <Btn busy={busyId === `banWallet-${e.address}`} onClick={() => act("banWallet", e.address)} tone="rose">
                Ban wallet
              </Btn>
            )}
          </Row>
        ))}
        {(data?.cup?.length ?? 0) === 0 && <Empty />}
      </Section>

      {/* manual recovery */}
      <div className="mt-5 rounded-2xl border border-line bg-void-800 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Recover a match by ID</p>
        <div className="flex flex-wrap items-center gap-2">
          <input value={manualId} onChange={(e) => setManualId(e.target.value.replace(/\D/g, ""))} placeholder="Match ID" inputMode="numeric" className="nums w-28 rounded-xl border border-line bg-void-700 px-3 py-2 text-sm text-ink outline-none focus:border-teal/50" />
          <Btn busy={busyId === `settleMatch-${manualId}`} onClick={() => manualId && act("settleMatch", manualId)}>Pay winner</Btn>
          <Btn busy={busyId === `settleMatch-${manualId}`} onClick={() => manualId && act("settleMatch", manualId, 42220)}>Pay on mainnet</Btn>
          <Btn busy={busyId === `refundMatch-${manualId}`} onClick={() => manualId && act("refundMatch", manualId)} tone="rose">Refund both</Btn>
        </div>
      </div>

      <Section title={`Matches needing attention (${data?.matches?.length ?? 0})`}>
        {(data?.matches ?? []).map((m) => (
          <Row key={m.id} title={`#${m.id} · ${m.game}`} sub={`${m.status}${m.settle_error ? " · " + m.settle_error : ""}`} chain={m.chain_id} tx={m.settle_tx}>
            <Btn busy={busyId === `settleMatch-${m.id}`} onClick={() => act("settleMatch", m.id)}>Pay</Btn>
            <Btn busy={busyId === `settleMatch-${m.id}`} onClick={() => act("settleMatch", m.id, 42220)}>Mainnet</Btn>
            <Btn busy={busyId === `refundMatch-${m.id}`} onClick={() => act("refundMatch", m.id)} tone="rose">Refund</Btn>
          </Row>
        ))}
        {(data?.matches?.length ?? 0) === 0 && <Empty />}
      </Section>

      <Section title={`Tournaments needing attention (${data?.tournaments?.length ?? 0})`}>
        {(data?.tournaments ?? []).map((t) => (
          <Row key={t.id} title={`Cup #${t.id}`} sub={`${t.status}${t.settle_error ? " · " + t.settle_error : ""}`} chain={t.chain_id} tx={t.settle_tx}>
            <Btn busy={busyId === `settleTournament-${t.id}`} onClick={() => act("settleTournament", t.id)}>Settle</Btn>
          </Row>
        ))}
        {(data?.tournaments?.length ?? 0) === 0 && <Empty />}
      </Section>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-[60dvh] w-full max-w-md flex-col items-center justify-center px-5 text-center">{children}</div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Row({ title, sub, chain, tx, children }: { title: string; sub: string; chain?: number; tx?: string | null; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-void-800 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="truncate text-[11px] text-ink-faint">{sub}</p>
        </div>
        {tx && chain && EXPLORER[chain] && (
          <ExternalA href={`${EXPLORER[chain]}${tx}`} className="shrink-0 text-ink-faint hover:text-teal"><ExternalLink className="h-3.5 w-3.5" /></ExternalA>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
function Btn({ children, onClick, busy, tone }: { children: React.ReactNode; onClick: () => void; busy?: boolean; tone?: "rose" }) {
  return (
    <button onClick={onClick} disabled={busy} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-60", tone === "rose" ? "border-line bg-void-700 text-ink-dim hover:text-rose" : "border-line bg-void-700 text-ink-dim hover:text-ink")}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}{children}
    </button>
  );
}
function Empty() {
  return <p className="rounded-2xl border border-dashed border-line px-4 py-4 text-center text-[12px] text-ink-faint">Nothing — all clear ✓</p>;
}
function VaultCard({ label, unit, v }: { label: string; unit: string; v: Vault | null }) {
  if (!v) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-3 text-center">
        <p className="text-[11px] text-ink-faint">{label}</p>
        <p className="mt-1 text-[11px] text-ink-faint">not set</p>
      </div>
    );
  }
  return (
    <div className={cn("rounded-2xl border p-3 text-center", v.low ? "border-rose/40 bg-rose/[0.06]" : "border-line bg-void-800")}>
      <p className="text-[11px] text-ink-faint">{label}</p>
      <p className={cn("nums mt-0.5 text-lg font-bold", v.low ? "text-rose" : "text-ink")}>
        {v.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-[10px] font-medium text-ink-faint">{unit}</span>
      </p>
      {v.low && <p className="text-[9px] font-bold uppercase text-rose">top up</p>}
    </div>
  );
}
