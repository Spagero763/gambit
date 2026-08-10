"use client";

import { ReactNode, useState } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { celo, celoSepolia } from "viem/chains";
import { config, ACTIVE_CHAIN_ID } from "@/lib/wagmi";
import { inMiniPay } from "@/lib/minipay";
import { MiniPayConnect } from "@/components/MiniPayConnect";

// Public Privy app id (safe in the client). Override via env if it ever rotates.
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "cmqkrw0fi000l0dldcurqz6nt";
const defaultChain = ACTIVE_CHAIN_ID === celo.id ? celo : celoSepolia;

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  // Read once, at mount, so the login config never changes under Privy.
  // Inside MiniPay the wallet is already there and MiniPayConnect attaches it on
  // load, so email and social sign-in are removed entirely (MiniPay review item
  // 2: users land signed in, no other sign-in options).
  const [miniPay] = useState(() => inMiniPay());

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // web: email + socials create an invisible embedded wallet for newcomers,
        // "wallet" keeps MetaMask / injected working in the same flow.
        loginMethods: miniPay ? ["wallet"] : ["email", "google", "farcaster", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#3ecf8e",
          logo: "https://www.bestgambit.live/logo.svg",
          walletChainType: "ethereum-only",
        },
        embeddedWallets: {
          ethereum: { createOnLogin: miniPay ? "off" : "users-without-wallets" },
        },
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
