"use client";

import { useEffect } from "react";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { celo, celoSepolia } from "viem/chains";
import { ACTIVE_CHAIN_ID } from "@/lib/wagmi";
import { setAuthApi, setAuthState } from "@/lib/auth";

// Public Privy app id (safe in the client). Override via env if it ever rotates.
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "cmqkrw0fi000l0dldcurqz6nt";
const defaultChain = ACTIVE_CHAIN_ID === celo.id ? celo : celoSepolia;

/**
 * Web sign-in, loaded on demand (see lib/auth). Email and socials create an
 * embedded wallet for newcomers; "wallet" keeps MetaMask and friends working.
 * Never mounted inside MiniPay, where the injected wallet is all there is.
 */
export default function PrivyLayer() {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
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
      <Bridge />
    </PrivyProvider>
  );
}

/** Mirrors Privy into the auth store, and puts its wallet in front of wagmi. */
function Bridge() {
  const { ready, authenticated, user, login, logout, exportWallet } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { address } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setAuthState({ ready, authenticated, user: user ?? null });
  }, [ready, authenticated, user]);

  useEffect(() => {
    setAuthApi({
      login,
      logout: async () => {
        await logout();
        disconnect();
      },
      exportWallet: (o) => exportWallet(o),
    });
    return () => setAuthApi(null);
  }, [login, logout, exportWallet, disconnect]);

  // the embedded wallet for email/social sign-ins, otherwise the wallet they connected
  const wallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
  useEffect(() => {
    if (!ready || !authenticated || !walletsReady || !wallet) return;
    if (address?.toLowerCase() === wallet.address.toLowerCase()) return;
    let live = true;
    wallet
      .getEthereumProvider()
      .then((provider) => {
        if (!live) return;
        return connectAsync({ connector: injected({ target: { id: "privy", name: "Privy", provider: provider as any } }) });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [ready, authenticated, walletsReady, wallet, address, connectAsync]);

  return null;
}
