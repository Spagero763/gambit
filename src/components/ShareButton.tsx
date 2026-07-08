"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Share2, Check, Copy, X as CloseIcon } from "lucide-react";
import { Portal } from "@/components/Portal";

/**
 * One share button for the whole app. On phones it opens the native share
 * sheet, so people can post to WhatsApp, X, Telegram, Instagram, SMS or
 * anything else they have installed. Where there's no native sheet (mostly
 * desktop), it opens our own picker with the big networks plus copy.
 */
export function ShareButton({
  text,
  url,
  title = "Gambit",
  className,
  children,
}: {
  text: string;
  url: string;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const tap = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text, url });
        return;
      } catch {
        return; // user closed the native sheet — don't stack our picker on top
      }
    }
    setOpen(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 900);
    } catch {
      /* clipboard blocked */
    }
  };

  const enc = encodeURIComponent;
  const targets = [
    { name: "WhatsApp", href: `https://wa.me/?text=${enc(`${text} ${url}`)}` },
    { name: "X", href: `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}` },
    { name: "Telegram", href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}&quote=${enc(text)}` },
  ];

  return (
    <>
      <button onClick={tap} className={className}>
        {children}
      </button>

      {open && (
        <Portal>
          <div
            className="fixed inset-0 z-[130] grid items-end bg-void/70 backdrop-blur-sm sm:place-items-center"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-3xl border border-line bg-void-800 p-5 shadow-pop sm:max-w-sm sm:rounded-3xl"
            >
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Share2 className="h-4 w-4 text-teal" /> Share to
                </p>
                <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-faint hover:text-ink">
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {targets.map((t) => (
                  <a
                    key={t.name}
                    href={t.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-line bg-void-700 py-3 text-center text-sm font-medium text-ink transition-colors hover:border-teal/40"
                  >
                    {t.name}
                  </a>
                ))}
              </div>

              <button
                onClick={copy}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-void-700 py-3 text-sm font-medium text-ink-dim transition-colors hover:text-ink"
              >
                {copied ? <Check className="h-4 w-4 text-teal" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy link"}
              </button>
            </motion.div>
          </div>
        </Portal>
      )}
    </>
  );
}
