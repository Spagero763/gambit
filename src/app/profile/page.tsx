import { Backdrop } from "@/components/Backdrop";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Profile } from "@/components/Profile";

export default function ProfilePage() {
  return (
    <main className="relative min-h-[100dvh]">
      <Backdrop />
      <Header />
      <Profile />
      <BottomNav />
    </main>
  );
}
