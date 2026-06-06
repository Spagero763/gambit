import { Trophy, CalendarClock, Layers } from "lucide-react";
import { Backdrop } from "@/components/Backdrop";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

const PLANNED = [
  {
    icon: Trophy,
    title: "Knockout tournaments",
    body: "Single-elimination brackets across all five games. Buy in, win your way to the final, split the prize pool.",
  },
  {
    icon: Layers,
    title: "Weekly score pools",
    body: "Same-seed Block Blitz and Whot pools. Everyone plays the same board; the top scores share the pot.",
  },
  {
    icon: CalendarClock,
    title: "Daily challenges",
    body: "A rotating free challenge each day for XP and a spot on the weekly ladder.",
  },
];

export default function EventsPage() {
  return (
    <main className="relative min-h-[100dvh]">
      <Backdrop />
      <Header />
      <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="mt-1 text-sm text-ink-dim">Tournaments and pooled play — in the works.</p>

        <ul className="mt-6 space-y-3">
          {PLANNED.map((e) => {
            const Icon = e.icon;
            return (
              <li
                key={e.title}
                className="flex gap-3.5 rounded-2xl border border-line bg-void-700 p-4 shadow-card"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-void-600 text-ink-dim">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink">{e.title}</h3>
                    <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                      Soon
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-dim">{e.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <BottomNav />
    </main>
  );
}
