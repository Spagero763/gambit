import { Backdrop } from "@/components/Backdrop";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Leaderboard } from "@/components/Leaderboard";

export default function LeaderboardPage() {
  return (
    <main className="relative min-h-screen">
      <Backdrop />
      <Header />
      <Leaderboard />
      <BottomNav />
    </main>
  );
}
