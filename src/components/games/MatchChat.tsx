"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getToken } from "@/lib/profile";
import { useProfiles, displayName, avatarHex } from "@/lib/profiles";
import { Avatar } from "@/components/Avatar";
import { play } from "@/lib/sfx";
import { cn } from "@/lib/cn";

interface Msg {
  id: number;
  sender: string;
  body: string;
  created_at: string;
}

const QUICK = ["GG 🤝", "Nice move!", "🔥", "😅", "Your turn…", "Rematch?"];

/**
 * In-match chat: floating bubble with unread badge, slide-up panel, quick
 * chips and live delivery (Supabase realtime, polling fallback). Server
 * verifies the sender's session token + seat, so only the two players can talk.
 */
export function MatchChat({ matchId, me }: { matchId: bigint; me: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const meLower = me.toLowerCase();

  const senders = msgs.map((m) => m.sender);
  const profiles = useProfiles(senders);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/match/chat?id=${matchId.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data.messages)) setMsgs(data.messages);
    } catch {
      /* offline blip — next poll catches up */
    }
  }, [matchId]);

  // initial load + live updates (realtime when available, polling fallback)
  useEffect(() => {
    load();
    if (supabase) {
      const ch = supabase
        .channel(`chat-${matchId.toString()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "match_messages", filter: `match_id=eq.${matchId.toString()}` },
          (payload) => {
            const m = payload.new as Msg;
            setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
            if (m.sender !== meLower) {
              play("place");
              if (!openRef.current) setUnread((u) => u + 1);
            }
          }
        )
        .subscribe();
      return () => {
        supabase?.removeChannel(ch);
      };
    }
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [matchId, meLower, load]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      scrollDown();
    }
  }, [open, msgs.length, scrollDown]);

  const send = async (text: string) => {
    const body = text.trim();
    if (!body) return;
    setDraft("");
    // optimistic echo
    const tmp: Msg = { id: -Date.now(), sender: meLower, body, created_at: new Date().toISOString() };
    setMsgs((prev) => [...prev, tmp]);
    scrollDown();
    try {
      await fetch("/api/match/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: matchId.toString(), player: me, body, token: getToken(me) }),
      });
    } catch {
      /* realtime/poll will reconcile */
    }
  };

  return (
    <>
      {/* floating bubble — pinned to the right edge at mid-height so it never
          sits over the hand of cards (bottom) or the opponent strip (top) */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.88 }}
        aria-label="Match chat"
        className="fixed right-2 top-1/2 z-40 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-void-700/95 text-ink shadow-pop backdrop-blur"
      >
        <MessageCircle className="h-5 w-5" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-teal px-1 text-[10px] font-bold text-void"
            >
              {unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed right-3 top-1/2 z-40 flex max-h-[60dvh] w-[min(92vw,20rem)] -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-void-800/98 shadow-pop backdrop-blur"
          >
            <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
              <p className="text-sm font-semibold text-ink">Match chat</p>
              <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-ink-faint transition-colors hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
              {msgs.length === 0 && (
                <p className="py-4 text-center text-[12px] text-ink-faint">Say hi. Only you two can see this.</p>
              )}
              {msgs.map((m) => {
                const mine = m.sender === meLower;
                const p = profiles[m.sender];
                return (
                  <div key={m.id} className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
                    {!mine && (
                      <Avatar image={p?.avatar_image || undefined} color={avatarHex(p)} name={displayName(m.sender, p)} size={22} rounded="rounded-md" />
                    )}
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-3 py-1.5 text-[13px] leading-snug",
                        mine ? "rounded-br-md bg-teal text-void" : "rounded-bl-md bg-void-600 text-ink"
                      )}
                    >
                      {m.body}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* quick chips */}
            <div className="flex gap-1.5 overflow-x-auto px-3 pb-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="shrink-0 rounded-full border border-line bg-void-700 px-2.5 py-1 text-[11px] text-ink-dim transition-colors hover:text-ink"
                >
                  {q}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
              className="flex items-center gap-2 border-t border-line p-2.5"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={200}
                placeholder="Message…"
                className="min-w-0 flex-1 rounded-xl border border-line bg-void-700 px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-teal/50"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label="Send"
                className="btn-primary grid h-9 w-9 shrink-0 place-items-center rounded-xl disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
