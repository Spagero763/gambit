"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Loader2 } from "lucide-react";
import { useAccount, useBalance, useDisconnect } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { useMiniPay } from "@/hooks/useMiniPay";
import { CUSD_ADDRESS } from "@/lib/wagmi";

function short(addr?: string) {
  return addr ? `${addr.slice(0, 5)}…${addr.slice(-4)}` : "";
}

export function WalletPill() {
  const { isMiniPay, ready } = useMiniPay();
  const { address, isConnected } = useAccount();
  const { data: bal } = useBalance({
    address,
    token: CUSD_ADDRESS,
    query: { enabled: !!address },
  });
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();

  if (!ready) return <div className="h-10 w-28 rounded-full glass" />;

  if (isConnected && address) {
    const amount = bal ? Number(bal.formatted).toFixed(2) : "0.00";
    return (
      <motion.button
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => open({ view: "Account" })}
        className="flex items-center gap-2 rounded-full glass py-1.5 pl-2 pr-3 transition-colors hover:bg-white/[0.06]"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-violet to-teal text-[11px] font-bold text-void">
          {address.slice(2, 4).toUpperCase()}
        </span>
        <div className="leading-tight text-left">
          <p className="font-mono text-[11px] text-ink">{short(address)}</p>
          <p className="text-[10px] text-teal">{amount} cUSD</p>
        </div>
      </motion.button>
    );
  }

  // Inside MiniPay the connection is implicit, the injected connector auto-connects.
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
        onClick={() => open()}
        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-deep to-violet px-4 py-2 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-glow-teal"
      >
        <Wallet className="h-4 w-4" />
        Connect
      </motion.button>
    </AnimatePresence>
  );
}
