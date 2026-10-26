"use client";

import { useState } from "react";
import { Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { useAccount, useChainId, useReadContract, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS } from "@/lib/escrow";
import { ExternalA } from "@/components/ExternalA";

const CELO = 42220;
const DAY = 86_400;

const human = (s: number) => (s % 3600 === 0 ? `${s / 3600} hour${s === 3600 ? "" : "s"}` : `${Math.round(s / 60)} minutes`);

/**
 * How long after a match starts anyone may refund both players with
 * reclaimStalled. It is the players' safety valve if a payout never lands,
 * but set too short it also lets whoever is losing a long game cancel it.
 * A day keeps the valve and closes that door. Owner wallet only.
 */
export function AdminSettleWindow({ owner }: { owner: string }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const escrow = ESCROW_ADDRESS[CELO];

  const [busy, setBusy] = useState(false);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | null>(null);

  const { data, refetch } = useReadContract({ address: escrow, abi: ESCROW_ABI, functionName: "settleWindow", chainId: CELO });
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash, query: { enabled: !!hash } });

  const current = data !== undefined ? Number(data) : null;
  const isOwner = !!address && address.toLowerCase() === owner.toLowerCase();

  const set = async () => {
    setError(null);
    setHash(undefined);
    setBusy(true);
    try {
      const h = await writeContractAsync({ address: escrow, abi: ESCROW_ABI, functionName: "setSettleWindow", args: [BigInt(DAY)] });
      setHash(h);
      setTimeout(() => refetch(), 4000);
    } catch (e: any) {
      const m = String(e?.shortMessage ?? e?.message ?? "Transaction failed");
      setError(m.includes("NOT_OWNER") ? "That wallet is not the contract owner." : m.slice(0, 160));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 rounded-2xl border border-line bg-void-800 p-4">
      <p className="text-[13px] font-bold text-ink">Refund window</p>
      <p className="mt-0.5 text-[11px] text-ink-faint">
        After this long, anyone can refund both players of a live match. Too short and a losing player can cancel a long game.
      </p>
      <p className="mt-3 text-[13px] text-ink-dim">
        Now: <span className="font-semibold text-ink">{current === null ? "…" : human(current)}</span>
        {current !== null && current < DAY && <span className="ml-2 text-amber">Recommended: 24 hours</span>}
      </p>

      {current !== null && current < DAY &&
        (!isOwner ? (
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-amber/40 bg-amber/[0.08] px-3 py-2 text-[12px] text-amber">
            <AlertTriangle className="h-4 w-4 shrink-0" /> Connect the owner wallet to change this.
          </p>
        ) : chainId !== CELO ? (
          <button
            onClick={() => switchChain({ chainId: CELO })}
            className="mt-3 w-full rounded-xl border border-amber/40 bg-amber/[0.08] px-3 py-2 text-[12px] font-semibold text-amber"
          >
            Switch to Celo to continue
          </button>
        ) : (
          <button
            onClick={set}
            disabled={busy || confirming}
            className="btn-primary mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[13px] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Set to 24 hours
          </button>
        ))}

      {error && <p role="alert" className="mt-2 text-[11px] font-medium text-rose">{error}</p>}
      {hash && (
        <p className="mt-2 text-center text-[11px]">
          {confirming ? <span className="text-ink-dim">Landing on-chain… </span> : <span className="font-semibold text-teal">Done. </span>}
          <ExternalA href={`https://celoscan.io/tx/${hash}`} className="inline-flex items-center gap-1 text-ink-dim hover:text-ink">
            View on Celoscan <ExternalLink className="h-3 w-3" />
          </ExternalA>
        </p>
      )}
    </div>
  );
}
