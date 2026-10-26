import { fallback, http, type Transport } from "viem";

export const CELO_READ_URLS = ["https://forno.celo.org", "https://rpc.ankr.com/celo", "https://celo.drpc.org"];

// Shared read transport for server-side public clients. Fails over across
// public Celo endpoints so a forno hiccup doesn't break read-only paths.
// Payout paths keep their own tuned transports; this is only for reads.
export function celoReadTransport(): Transport {
  return fallback(CELO_READ_URLS.map((u) => http(u)));
}
