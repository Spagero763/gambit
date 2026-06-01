"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Loader2 } from "lucide-react";
import { useAccount, useConnect, useBalance } from "wagmi";
import { injected } from "wagmi/connectors";
import { useMiniPay } from "@/hooks/useMiniPay";
import { CUSD_ADDRESS } from "@/lib/wagmi";

function short(addr?: string) {
  return addr ? `${addr.slice(0, 5)}…${addr.slice(-4)}` : "";
}

export function WalletPill() {
  const { isMiniPay, ready } = useMiniPay();
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { data: bal } = useBalance({
    address,
    token: CUSD_ADDRESS,
    query: { enabled: !!address },
  });

  if (!ready) return <div className="h-10 w-28 rounded-full glass" />;

  if (isConnected && address) {
    const amount = bal ? Number(bal.formatted).toFixed(2) : "0.00";
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 rounded-full glass py-1.5 pl-2 pr-3"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-violet to-teal text-[11px] font-bold text-void">
          {address.slice(2, 4).toUpperCase()}
        </span>
        <div className="leading-tight">
          <p className="font-mono text-[11px] text-ink">{short(address)}</p>
          <p className="text-[10px] text-teal">{amount} cUSD</p>
        </div>
      </motion.div>
    );
  }

  // Inside MiniPay the connection is implicit, so we never show a connect button.
  if (isMiniPay) {
    return (
      <div className="flex items-center gap-2 rounded-full glass px-3 py-2 text-xs text-ink-dim">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Linking…
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => connect({ connector: injected() })}
        disabled={isPending}
        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-deep to-violet px-4 py-2 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-glow-teal disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        Connect
      </motion.button>
    </AnimatePresence>
  );
}
