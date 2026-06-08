import { Backdrop } from "@/components/Backdrop";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Events } from "@/components/Events";

export default function EventsPage() {
  return (
    <main className="relative min-h-[100dvh]">
      <Backdrop />
      <Header />
      <Events />
      <BottomNav />
    </main>
  );
}
