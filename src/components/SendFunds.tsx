"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X, Send, Loader2, Check, ExternalLink, AlertTriangle } from "lucide-react";
import { useAccount, useBalance, useSwitchChain } from "wagmi";
import { formatUnits } from "viem";
import { ACTIVE_CHAIN_ID } from "@/lib/wagmi";
import { tokensFor } from "@/lib/tokens";
import { celo } from "viem/chains";
import { useSendFunds, SendAsset } from "@/hooks/useSendFunds";
import { cn } from "@/lib/cn";

const EXPLORER: Record<number, string> = {
  42220: "https://celoscan.io/tx/",
  11142220: "https://sepolia.celoscan.io/tx/",
};

// CELO + every stake token on the active chain, as sendable assets.
function useAssets(): SendAsset[] {
  return useMemo(() => {
    const tokens = tokensFor(ACTIVE_CHAIN_ID).map(
      (t): SendAsset => ({ kind: "erc20", address: t.address, symbol: t.symbol, decimals: t.decimals })
    );
    const native: SendAsset = { kind: "native", symbol: "CELO", decimals: 18 };
    return [...tokens, native];
  }, []);
}

function assetKey(a: SendAsset) {
  return a.kind === "native" ? "native" : a.address;
}

export function SendFunds({ address, onClose }: { address: `0x${string}`; onClose: () => void }) {
  const assets = useAssets();
  const [asset, setAsset] = useState<SendAsset>(assets[0]);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const { chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { send, step, error, txHash, reset, onActiveChain } = useSendFunds();

  const { data: bal } = useBalance({
    address,
    token: asset.kind === "erc20" ? asset.address : undefined,
    query: { enabled: !!address },
  });
  const balance = bal ? Number(bal.formatted) : 0;

  const busy = step === "sending" || step === "confirming";
  const done = step === "done";

  const setMax = () => {
    if (!bal) return;
    if (asset.kind === "native") {
      // keep a little CELO back for the fee
      const keep = 0.005;
      setAmount(Math.max(0, Number(formatUnits(bal.value, 18)) - keep).toFixed(4));
    } else {
      setAmount(bal.formatted);
    }
  };

  const submit = () => {
    if (busy) return;
    send(asset, to, amount);
  };

  const explorer = EXPLORER[ACTIVE_CHAIN_ID] ?? EXPLORER[celo.id];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-void-900/70 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-line bg-void-800 p-5 shadow-card sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Send funds</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:text-ink"><X className="h-5 w-5" /></button>
        </div>

        {done ? (
          <div className="py-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-teal/15 text-teal">
              <Check className="h-6 w-6" />
            </span>
            <p className="mt-4 text-sm font-medium text-ink">Sent {amount} {asset.symbol}</p>
            <p className="mt-1 text-xs text-ink-faint">to {to.slice(0, 6)}…{to.slice(-4)}</p>
            {txHash && (
              <a href={`${explorer}${txHash}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs text-teal hover:underline">
                View on explorer <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <button onClick={onClose} className="btn-primary mt-5 w-full rounded-xl py-3 text-sm shadow-glow">Done</button>
          </div>
        ) : !onActiveChain ? (
          <div className="py-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-void-600 text-amber-400"><AlertTriangle className="h-5 w-5" /></span>
            <p className="mt-4 text-sm text-ink-dim">Switch to the Celo network to send.</p>
            <button onClick={() => switchChain({ chainId: ACTIVE_CHAIN_ID })} className="btn-primary mt-5 w-full rounded-xl py-3 text-sm shadow-glow">Switch to Celo</button>
          </div>
        ) : (
          <>
            {/* asset picker */}
            <div className="mt-4 flex gap-2">
              {assets.map((a) => (
                <button
                  key={assetKey(a)}
                  onClick={() => { setAsset(a); setAmount(""); reset(); }}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                    assetKey(a) === assetKey(asset) ? "border-teal/50 bg-teal/10 text-ink" : "border-line bg-void-700 text-ink-dim hover:text-ink"
                  )}
                >
                  {a.symbol}
                </button>
              ))}
            </div>

            {/* recipient */}
            <label className="mt-4 block text-xs font-medium text-ink-faint">Recipient address</label>
            <input
              value={to}
              onChange={(e) => { setTo(e.target.value); reset(); }}
              placeholder="0x…"
              spellCheck={false}
              className="mt-1.5 w-full rounded-xl border border-line bg-void-700 px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-teal/50"
            />

            {/* amount */}
            <div className="mt-4 flex items-center justify-between">
              <label className="text-xs font-medium text-ink-faint">Amount</label>
              <span className="text-[11px] text-ink-faint">Balance: <span className="nums">{balance.toFixed(4)}</span> {asset.symbol}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-line bg-void-700 px-3 py-2.5 focus-within:border-teal/50">
              <input
                value={amount}
                onChange={(e) => { setAmount(e.target.value.replace(/[^\d.]/g, "")); reset(); }}
                placeholder="0.00"
                inputMode="decimal"
                className="nums min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
              />
              <button onClick={setMax} className="shrink-0 rounded-lg bg-void-600 px-2 py-1 text-[11px] font-semibold text-teal hover:bg-void-500">MAX</button>
            </div>

            {asset.kind === "erc20" && (
              <p className="mt-2 text-[11px] text-ink-faint">You also need a little CELO in this wallet for the network fee.</p>
            )}

            {error && (
              <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-rose/30 bg-rose/[0.06] px-3 py-2 text-[12px] text-rose">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
              </p>
            )}

            <button
              onClick={submit}
              disabled={busy || !to || !amount}
              className="btn-primary mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm shadow-glow disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {step === "sending" ? "Confirm in wallet…" : step === "confirming" ? "Sending…" : `Send ${asset.symbol}`}
            </button>
            <p className="mt-2 text-center text-[11px] text-ink-faint">Sends on the Celo network. Double-check the address — transfers can&apos;t be undone.</p>
          </>
        )}
      </motion.div>
    </div>
  );
}
