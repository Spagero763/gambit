"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { useAccount, useChainId, useSwitchChain, useWriteContract } from "wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS } from "@/lib/escrow";
import { getToken } from "@/lib/profile";
import { ExternalA } from "@/components/ExternalA";

const CELO = 42220;

export interface RewardsStatus {
  wallet: string | null;
  feeRecipient: string;
  feesToWallet: boolean;
  celo: number | null;
  coins: { symbol: string; owed: number; held: number | null }[];
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/**
 * Cashback and invite rewards: what is owed per coin against what the rewards
 * wallet holds. Once the escrow sends its fees to that wallet the rewards fund
 * themselves; profit above what is owed can be moved out any time.
 */
export function AdminRewards({ status, owner, onChange }: { status: RewardsStatus; owner: string; onChange: () => void }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const isOwner = !!address && address.toLowerCase() === owner.toLowerCase();

  const post = async (path: string, label: string) => {
    if (!address) return;
    setBusy(label);
    setMsg(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: getToken(address) }),
      });
      const d = await res.json();
      if (d.error) setMsg(d.error);
      else if (path.endsWith("payout"))
        setMsg(`Sent ${d.sent}, confirmed ${d.paid}.${d.short?.length ? ` Not enough ${d.short.join(", ")} in the wallet for some.` : ""}`);
      else setMsg(d.sent?.length ? `Sent ${d.sent.map((s: any) => `${s.amount.toFixed(2)} ${s.symbol}`).join(", ")} to ${short(d.to)}.` : "Nothing above what's owed to move yet.");
      onChange();
    } catch (e: any) {
      setMsg(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  const routeFees = async () => {
    if (!status.wallet) return;
    setBusy("route");
    setMsg(null);
    try {
      const h = await writeContractAsync({
        address: ESCROW_ADDRESS[CELO],
        abi: ESCROW_ABI,
        functionName: "setFeeRecipient",
        args: [status.wallet as `0x${string}`],
      });
      setHash(h);
      setTimeout(onChange, 5000);
    } catch (e: any) {
      const m = String(e?.shortMessage ?? e?.message ?? "Transaction failed");
      setMsg(m.includes("NOT_OWNER") ? "That wallet is not the contract owner." : m.slice(0, 160));
    } finally {
      setBusy(null);
    }
  };

  if (!status.wallet) {
    return (
      <div className="mt-2 rounded-2xl border border-line bg-void-800 p-4">
        <p className="text-[13px] font-bold text-ink">Rewards</p>
        <p className="mt-1 text-[12px] text-amber">The rewards wallet isn&apos;t set up. Add TREASURY_PRIVATE_KEY in Vercel to pay cashback and invite rewards.</p>
      </div>
    );
  }

  // a payout costs about 0.012 CELO at Celo's 200 gwei floor; this covers a few dozen
  const lowGas = status.celo !== null && status.celo < 0.5;

  return (
    <div className="mt-2 rounded-2xl border border-line bg-void-800 p-4">
      <p className="text-[13px] font-bold text-ink">Rewards</p>
      <p className="mt-0.5 text-[11px] text-ink-faint">
        Cashback and invite shares (1% of an entry each), paid daily from {short(status.wallet)} once someone is owed 0.10.
      </p>

      <div className="mt-3 space-y-1.5">
        {status.coins.map((c) => {
          const shortOf = c.held !== null && c.held < c.owed;
          return (
            <div key={c.symbol} className="flex items-center justify-between rounded-xl bg-void-700 px-3 py-2 text-[12px]">
              <span className="font-semibold text-ink">{c.symbol}</span>
              <span className="nums text-ink-dim">
                owed <span className="text-ink">{c.owed.toFixed(2)}</span> · in wallet{" "}
                <span className={shortOf ? "font-semibold text-rose" : "text-ink"}>{c.held === null ? "?" : c.held.toFixed(2)}</span>
              </span>
            </div>
          );
        })}
      </div>
      {lowGas && (
        <p className="mt-2 flex items-center gap-2 text-[11px] text-amber">
          <AlertTriangle className="h-3.5 w-3.5" /> The rewards wallet has {status.celo?.toFixed(3)} CELO; send it some for network fees.
        </p>
      )}

      <p className="mt-3 text-[11px] text-ink-dim">
        Fees now go to <span className="font-mono text-ink">{short(status.feeRecipient)}</span>
        {status.feesToWallet ? " (the rewards wallet), so rewards fund themselves." : " (not the rewards wallet), so rewards need topping up by hand."}
      </p>

      {!status.feesToWallet &&
        (!isOwner ? (
          <p className="mt-2 text-[11px] text-amber">Connect the owner wallet to change where fees go.</p>
        ) : chainId !== CELO ? (
          <button onClick={() => switchChain({ chainId: CELO })} className="mt-2 w-full rounded-xl border border-amber/40 bg-amber/[0.08] px-3 py-2 text-[12px] font-semibold text-amber">
            Switch to Celo to continue
          </button>
        ) : (
          <button onClick={routeFees} disabled={!!busy} className="btn-glass mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[13px] disabled:opacity-60">
            {busy === "route" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send fees to the rewards wallet
          </button>
        ))}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => post("/api/rewards/payout", "pay")} disabled={!!busy} className="btn-primary flex h-11 items-center justify-center gap-2 rounded-full text-[13px] disabled:opacity-60">
          {busy === "pay" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Pay rewards now
        </button>
        <button onClick={() => post("/api/rewards/profit", "profit")} disabled={!!busy} className="btn-glass flex h-11 items-center justify-center gap-2 rounded-full text-[13px] disabled:opacity-60">
          {busy === "profit" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Move profit to my wallet
        </button>
      </div>

      {msg && <p role="alert" className="mt-2 text-[11px] text-ink-dim">{msg}</p>}
      {hash && (
        <ExternalA href={`https://celoscan.io/tx/${hash}`} className="mt-2 inline-flex items-center gap-1 text-[11px] text-ink-dim hover:text-ink">
          Fee change on Celoscan <ExternalLink className="h-3 w-3" />
        </ExternalA>
      )}
    </div>
  );
}
