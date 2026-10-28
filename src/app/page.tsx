import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { DailyReward } from "@/components/DailyReward";
import { DailyChallengeCard } from "@/components/DailyChallengeCard";
import { GameGrid } from "@/components/GameGrid";
import { TrustStrip } from "@/components/TrustStrip";
import { BottomNav } from "@/components/BottomNav";
import { LiveNow } from "@/components/LiveNow";
import {
  LazyActiveGames,
  LazyDailyStrip,
  LazySaveProgressPrompt,
} from "@/components/HomeLazy";

export default function Home() {
  return (
    <main className="relative min-h-[100dvh]">
      <Header />
      <div className="mx-auto w-full lg:grid lg:max-w-6xl lg:grid-cols-2 lg:items-start lg:gap-8 lg:px-5 lg:pt-6">
        <div>
          <Hero />
          <LiveNow />
        </div>
        <div className="px-5 pt-6 lg:px-0 lg:pt-0">
          <DailyReward />
          <DailyChallengeCard />
          <LazySaveProgressPrompt />
          <LazyActiveGames />
          <LazyDailyStrip />
        </div>
      </div>
      <GameGrid />
      <TrustStrip />
      <BottomNav />
    </main>
  );
}
