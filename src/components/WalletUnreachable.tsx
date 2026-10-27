"use client";

import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";

/** Shown only when MiniPay's wallet never attached. */
export function WalletUnreachable({ onRetry, className }: { onRetry: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("rounded-[20px] border border-rose/30 bg-rose/[0.08] px-4 py-3.5 text-center", className)}>
      <p className="text-[16px] leading-snug text-ink">We couldn&apos;t reach your MiniPay wallet. Unlock MiniPay and try again.</p>
      <button onClick={onRetry} className="btn-glass mt-3 inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px]">
        <RotateCcw className="h-4 w-4" /> Try again
      </button>
    </div>
  );
}
