"use client";

import { useState } from "react";
import { Loader2, Check, X, ExternalLink, AlertTriangle } from "lucide-react";
import { useAccount, useChainId, useReadContracts, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS } from "@/lib/escrow";
import { tokensFor } from "@/lib/tokens";
import { ExternalA } from "@/components/ExternalA";
import { cn } from "@/lib/cn";

const CELO = 42220;

/**
 * Which stablecoins the escrow accepts, and a switch to change that.
 *
 * `setTokenAllowed` is onlyOwner and the relayer is not the owner, so this is
 * signed by the connected owner wallet in the browser like every other money
 * control here. It matters more than it looks: a token that shows in the picker
 * but is not allowlisted costs the player gas on the ERC20 approve and then
 * reverts the stake. The stake picker reads this same allowlist, so flipping a
 * switch here is what makes a token appear for players.
 */
export function AdminTokenAllowlist({ owner }: { owner: string }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const tokens = tokensFor(CELO);
  const escrow = ESCROW_ADDRESS[CELO];

  const [pending, setPending] = useState<string | null>(null);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | null>(null);

  const { data, refetch } = useReadContracts({
    contracts: tokens.map((t) => ({
      address: escrow,
      abi: ESCROW_ABI,
      functionName: "allowedTokens" as const,
      args: [t.address] as const,
      chainId: CELO,
    })),
  });

  const { isLoading: confirming } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  const isOwner = !!address && address.toLowerCase() === owner.toLowerCase();
  const wrongChain = chainId !== CELO;

  const toggle = async (token: `0x${string}`, next: boolean) => {
    setError(null);
    setHash(undefined);
    setPending(token);
    try {
      const h = await writeContractAsync({
        address: escrow,
        abi: ESCROW_ABI,
        functionName: "setTokenAllowed",
        args: [token, next],
      });
      setHash(h);
      // the read is cached, so ask for it again once the tx is in
      setTimeout(() => refetch(), 4000);
    } catch (e: any) {
      const m = String(e?.shortMessage ?? e?.message ?? "Transaction failed");
      setError(m.includes("NOT_OWNER") ? "That wallet is not the contract owner." : m.slice(0, 160));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="mt-2 rounded-2xl border border-line bg-void-800 p-4">
      <p className="text-[13px] font-bold text-ink">Stake tokens</p>
      <p className="mt-0.5 text-[11px] text-ink-faint">
        Only tokens switched on here can be staked. Players never see the others, so nobody pays a fee on an approve that reverts.
      </p>

      {!isOwner ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-amber/40 bg-amber/[0.08] px-3 py-2 text-[12px] text-amber">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Connect the owner wallet to change this.
        </p>
      ) : wrongChain ? (
        <button
          onClick={() => switchChain({ chainId: CELO })}
          className="mt-3 w-full rounded-xl border border-amber/40 bg-amber/[0.08] px-3 py-2 text-[12px] font-semibold text-amber"
        >
          Switch to Celo to continue
        </button>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {tokens.map((t, i) => {
            const res = data?.[i];
            const known = res?.status === "success";
            const allowed = known && res.result === true;
            const busy = pending === t.address;
            return (
              <li key={t.address} className="flex items-center gap-3 rounded-xl border border-line bg-void-700 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-ink">{t.symbol}</span>
                  <span className="block truncate font-mono text-[10px] text-ink-faint">
                    {t.address.slice(0, 10)}…{t.address.slice(-6)}
                  </span>
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold",
                    !known ? "bg-void-600 text-ink-faint" : allowed ? "bg-teal/15 text-teal" : "bg-rose/15 text-rose"
                  )}
                >
                  {!known ? "…" : allowed ? <><Check className="h-3 w-3" /> ON</> : <><X className="h-3 w-3" /> OFF</>}
                </span>
                <button
                  onClick={() => toggle(t.address, !allowed)}
                  disabled={!known || busy || confirming}
                  className={cn(
                    "inline-flex min-w-[72px] items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50",
                    allowed ? "border-line text-ink-dim hover:text-ink" : "border-teal/50 bg-teal/[0.12] text-teal"
                  )}
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : allowed ? "Turn off" : "Turn on"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="mt-2 text-[11px] font-medium text-rose">{error}</p>}
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
