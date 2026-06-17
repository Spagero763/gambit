"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, Home } from "lucide-react";

/** Route-level error boundary — a friendly recovery screen instead of a crash. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // surface to the console for debugging; never show the raw stack to users
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-void px-6 text-center">
      <div className="w-full max-w-sm">
        <p className="font-display text-2xl font-bold text-ink">Something hiccuped</p>
        <p className="mt-2 text-sm text-ink-dim">
          A part of the page failed to load. Your games and balances are safe — nothing here touches your funds.
        </p>
        <div className="mt-6 flex justify-center gap-2.5">
          <button onClick={reset} className="btn-primary inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm shadow-glow">
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
          <Link href="/" className="inline-flex items-center gap-2 rounded-2xl border border-line bg-void-700 px-5 py-3 text-sm font-semibold text-ink-dim transition-colors hover:text-ink">
            <Home className="h-4 w-4" /> Home
          </Link>
        </div>
      </div>
    </main>
  );
}
