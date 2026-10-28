"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { config } from "@/lib/wagmi";
import { MiniPayConnect } from "@/components/MiniPayConnect";
import { AuthHost } from "@/components/AuthHost";
import { useNavDirection } from "@/lib/navDirection";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  useNavDirection();

  // Plain wagmi with the injected wallet: MiniPay attaches itself here on load
  // (no button, no modal, no signature). Web sign-in sits beside the app in
  // AuthHost and is only loaded when it's needed.
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <MiniPayConnect />
        <AuthHost />
        {/* framer animations follow the phone's reduce-motion setting, like the CSS ones */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
