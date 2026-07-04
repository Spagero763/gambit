import { createConfig } from "@privy-io/wagmi";
import { http, fallback } from "wagmi";
import { injected } from "wagmi/connectors";
import { celo, celoSepolia } from "viem/chains";

export const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;

// Which chain the staking UI targets. Mainnet (celo) is the default now that
// we're live; set NEXT_PUBLIC_CHAIN=testnet to opt a build into Sepolia.
export const ACTIVE_CHAIN_ID =
  process.env.NEXT_PUBLIC_CHAIN === "testnet" ? celoSepolia.id : celo.id;

// Wagmi config for Privy. Privy manages its own connectors (embedded +
// external); the explicit injected() connector exists for MiniPay, whose
// listing rules require a silent auto-connect to the injected wallet with no
// modal (see MiniPayConnect).
// Mainnet reads go through a fallback list so a forno hiccup does not freeze
// balances and wallet reads for everyone. viem automatically ranks and fails
// over between these public endpoints.
export const config = createConfig({
  chains: [celo, celoSepolia],
  connectors: [injected()],
  transports: {
    [celo.id]: fallback([
      http("https://forno.celo.org"),
      http("https://rpc.ankr.com/celo"),
      http("https://celo.drpc.org"),
    ]),
    [celoSepolia.id]: http("https://forno.celo-sepolia.celo-testnet.org"),
  },
});
