"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { Portal } from "@/components/Portal";
import { askBot, SUGGESTIONS, type CupInfo } from "@/lib/chatbot";
import { cn } from "@/lib/cn";

// The bubble is hidden anywhere a game board or the ops panel is on screen, so
// it never sits over the chess board / Block Blitz, and never shows an admin a
// player help widget.
const HIDE_ON = ["/play", "/tournament/", "/admin"];

const BUBBLE = 56; // px
const MARGIN = 14;
const POS_KEY = "gambit.chat.pos.v1";
const MOVE_THRESHOLD = 5; // px before a press counts as a drag, not a tap

interface Msg {
  from: "bot" | "me";
  text: string;
  suggestions?: string[];
}

const GREETING =
  "Hey, I'm the Gambit helper. Ask me anything about playing, earning, or getting around. Tap a question to start.";

export function ChatBubble() {
  const pathname = usePathname();
  const hidden = HIDE_ON.some((p) => pathname === p || pathname.startsWith(p));

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: GREETING }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const cup = useRef<CupInfo | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);

  // resting position, snapped to whichever side is nearer
  const rest = useCallback((x: number, y: number) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const snapX = x + BUBBLE / 2 < w / 2 ? MARGIN : w - BUBBLE - MARGIN;
    const safe = Math.max(MARGIN + 60, Math.min(y, h - BUBBLE - MARGIN - 70));
    return { x: snapX, y: safe };
  }, []);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        setPos(rest(p.x, p.y));
        return;
      }
    } catch {}
    // default: bottom-right, comfortably above the fixed nav
    setPos({ x: window.innerWidth - BUBBLE - MARGIN, y: window.innerHeight - BUBBLE - MARGIN - 96 });
  }, [rest]);

  // live cup info so "what's the prize" answers with the real number
  useEffect(() => {
    if (!open || cup.current) return;
    fetch("/api/cup")
      .then((r) => r.json())
      .then((d) => {
        const daysLeft = d?.endsAt ? Math.max(0, Math.ceil((d.endsAt - Date.now()) / 86_400_000)) : undefined;
        cup.current = { prize: Number(d?.prize) || undefined, daysLeft };
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  const onDown = (e: React.PointerEvent) => {
    if (!pos) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !pos) return;
    const nx = e.clientX - drag.current.dx;
    const ny = e.clientY - drag.current.dy;
    if (!drag.current.moved && Math.hypot(nx - pos.x, ny - pos.y) > MOVE_THRESHOLD) {
      drag.current.moved = true;
      setDragging(true);
    }
    if (drag.current.moved) setPos({ x: nx, y: ny });
  };
  const onUp = () => {
    if (!drag.current || !pos) return;
    const moved = drag.current.moved;
    drag.current = null;
    setDragging(false);
    if (moved) {
      const snapped = rest(pos.x, pos.y);
      setPos(snapped);
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(snapped));
      } catch {}
    } else {
      setOpen((o) => !o);
    }
  };

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setMsgs((m) => [...m, { from: "me", text: q }]);
    setInput("");
    setTyping(true);
    const reply = askBot(q, cup.current);
    // a short, human-feeling think
    window.setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, { from: "bot", text: reply.text, suggestions: reply.suggestions }]);
    }, 450 + Math.random() * 350);
  };

  if (!mounted || hidden || !pos) return null;

  // panel opens from the side the bubble is docked on
  const onLeft = pos.x + BUBBLE / 2 < window.innerWidth / 2;

  return (
    <Portal>
      {/* the bubble */}
      <motion.button
        aria-label="Open Gambit help"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        whileTap={{ scale: dragging ? 1 : 0.9 }}
        className="fixed z-[140] grid touch-none place-items-center rounded-full text-white shadow-pop"
        style={{
          left: pos.x,
          top: pos.y,
          width: BUBBLE,
          height: BUBBLE,
          background: "linear-gradient(145deg, #7c5cff, #3ecf8e)",
          transition: dragging ? "none" : "left 0.32s cubic-bezier(0.22,1,0.36,1), top 0.32s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span key="c" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-amber text-void">
            <Sparkles className="h-2.5 w-2.5" />
          </span>
        )}
      </motion.button>

      {/* the chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className={cn(
              "fixed z-[139] flex w-[min(92vw,22rem)] flex-col overflow-hidden rounded-3xl border border-line bg-void-800 shadow-pop",
              onLeft ? "origin-bottom-left" : "origin-bottom-right"
            )}
            style={{
              [onLeft ? "left" : "right"]: MARGIN,
              bottom: Math.max(MARGIN, window.innerHeight - pos.y + 10),
              maxHeight: "min(70vh, 34rem)",
            }}
          >
            {/* header */}
            <div className="flex items-center gap-2.5 border-b border-line bg-void-700 px-4 py-3">
              <span className="grid h-8 w-8 place-items-center rounded-full text-white" style={{ background: "linear-gradient(145deg, #7c5cff, #3ecf8e)" }}>
                <MessageCircle className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">Gambit helper</p>
                <p className="text-[11px] text-teal">Here to help you play and earn</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-faint hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* messages */}
            <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3.5">
              {msgs.map((m, i) => (
                <div key={i} className={cn("flex flex-col", m.from === "me" ? "items-end" : "items-start")}>
                  <p
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug",
                      m.from === "me" ? "rounded-br-md bg-violet-bright text-white" : "rounded-bl-md bg-void-600 text-ink"
                    )}
                  >
                    {m.text}
                  </p>
                  {/* "did you mean" chips — tapping sends the exact question */}
                  {m.from === "bot" && m.suggestions && m.suggestions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="rounded-full border border-line bg-void-700 px-3 py-1.5 text-[11px] font-medium text-ink-dim transition-colors hover:border-teal/50 hover:text-ink"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <span className="flex gap-1 rounded-2xl rounded-bl-md bg-void-600 px-3.5 py-3">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        className="h-1.5 w-1.5 rounded-full bg-ink-faint"
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
                      />
                    ))}
                  </span>
                </div>
              )}

              {/* starter suggestions, only before the first question */}
              {msgs.length === 1 && !typing && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-line bg-void-700 px-3 py-1.5 text-[11px] font-medium text-ink-dim transition-colors hover:border-teal/50 hover:text-ink"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-line bg-void-700 px-3 py-2.5"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question…"
                className="min-w-0 flex-1 bg-transparent px-1 text-[13px] text-ink outline-none placeholder:text-ink-faint"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-bright text-white transition-opacity disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
