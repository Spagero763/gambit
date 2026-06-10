import { Backdrop } from "@/components/Backdrop";
import { AdminPanel } from "@/components/AdminPanel";

export const metadata = { robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <main className="relative min-h-[100dvh]">
      <Backdrop />
      <AdminPanel />
    </main>
  );
}
