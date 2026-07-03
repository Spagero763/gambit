"use client";

import { ReactNode, useState } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { celo, celoSepolia } from "viem/chains";
import { config, ACTIVE_CHAIN_ID } from "@/lib/wagmi";
import { MiniPayConnect } from "@/components/MiniPayConnect";

// Public Privy app id (safe in the client). Override via env if it ever rotates.
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "cmqkrw0fi000l0dldcurqz6nt";
const defaultChain = ACTIVE_CHAIN_ID === celo.id ? celo : celoSepolia;

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // email + socials create an invisible embedded wallet for newcomers;
        // "wallet" keeps MiniPay / MetaMask / injected working in the same flow.
        loginMethods: ["email", "google", "farcaster", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#3ecf8e",
          logo: "https://www.bestgambit.live/logo.svg",
          walletChainType: "ethereum-only",
        },
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        defaultChain,
        supportedChains: [celo, celoSepolia],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          <MiniPayConnect />
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
