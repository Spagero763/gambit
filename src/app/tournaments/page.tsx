import { Backdrop } from "@/components/Backdrop";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Tournaments } from "@/components/Tournaments";

export default function TournamentsPage() {
  return (
    <main className="relative min-h-[100dvh]">
      <Backdrop />
      <Header />
      <Tournaments />
      <BottomNav />
    </main>
  );
}
