import { Backdrop } from "@/components/Backdrop";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Stats } from "@/components/Stats";

export default function StatsPage() {
  return (
    <main className="relative min-h-[100dvh]">
      <Backdrop />
      <Header />
      <Stats />
      <BottomNav />
    </main>
  );
}
