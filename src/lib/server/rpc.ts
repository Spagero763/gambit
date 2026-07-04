import { fallback, http, type Transport } from "viem";

// Shared read transport for server-side public clients. Fails over across
// public Celo endpoints so a forno hiccup doesn't break read-only paths like
// the GoodID cup gate. Payout paths keep their own tuned transports; this is
// only for reads.
export function celoReadTransport(): Transport {
  return fallback([
    http("https://forno.celo.org"),
    http("https://rpc.ankr.com/celo"),
    http("https://celo.drpc.org"),
  ]);
}
