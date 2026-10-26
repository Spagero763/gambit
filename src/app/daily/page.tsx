import type { Metadata } from "next";
import { DailyChallenge } from "@/components/DailyChallenge";

export const metadata: Metadata = {
  title: "Daily Challenge | Gambit",
  description: "One board a day, the same for everyone. Play it, post your score, dare your friends.",
};

export default function DailyPage() {
  return (
    <main className="relative min-h-[100dvh]">
      <DailyChallenge />
    </main>
  );
}
