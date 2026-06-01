import { Swords } from "lucide-react";
import { Backdrop } from "@/components/Backdrop";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

export default function EventsPage() {
  return (
    <main className="relative min-h-screen">
      <Backdrop />
      <Header />
      <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-2">
        <h1 className="font-display text-2xl font-bold">Events</h1>
        <p className="mt-1 text-sm text-ink-dim">Tournaments and weekly pools.</p>

        <div className="mt-6 rounded-3xl glass p-8 text-center shadow-card">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-deep to-teal-deep">
            <Swords className="h-6 w-6 text-white" />
          </span>
          <p className="mt-4 text-sm text-ink-dim">
            Bracketed tournaments and weekly score pools are being built. Win
            your way to the top of the table and split the prize.
          </p>
        </div>
      </section>
      <BottomNav />
    </main>
  );
}
