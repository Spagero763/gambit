"use client";

import { keccak256, toHex } from "viem";
import { setToken } from "@/lib/profile";

// The stake itself proves the wallet is yours, so MiniPay never has to ask for a
// signature: this phone keeps a secret, the hash of it rides on the end of the
// stake transaction, and the server trades the secret plus that transaction for
// a session. Only the phone that built the transaction knows the secret.

interface Proof {
  secret: `0x${string}`;
  tx?: `0x${string}`;
  chainId?: number;
}

const key = (a: string) => `gambit:proof:${a.toLowerCase()}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function load(address: string): Proof | null {
  try {
    const raw = localStorage.getItem(key(address));
    return raw ? (JSON.parse(raw) as Proof) : null;
  } catch {
    return null;
  }
}

function save(address: string, p: Proof) {
  try {
    localStorage.setItem(key(address), JSON.stringify(p));
  } catch {
    /* without storage the proof can't outlive this page */
  }
}

/** Bytes to append to a stake transaction's calldata. */
export function proofSuffix(address: string): `0x${string}` {
  let p = load(address);
  if (!p) {
    p = { secret: toHex(crypto.getRandomValues(new Uint8Array(32))) };
    save(address, p);
  }
  return keccak256(p.secret);
}

/** Trade the latest stake for a session. Without a stake on record it does nothing. */
export async function claimSession(address: string, tx?: `0x${string}`, chainId?: number): Promise<boolean> {
  const p = load(address);
  if (!p) return false;
  if (tx && chainId) {
    p.tx = tx;
    p.chainId = chainId;
    save(address, p);
  }
  if (!p.tx || !p.chainId) return false;
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, tx: p.tx, chainId: p.chainId, secret: p.secret }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        setToken(address, data.token);
        return true;
      }
      // 409: the transaction hasn't reached the server's node yet
      if (res.status !== 409 && res.status !== 429 && res.status < 500) return false;
    } catch {
      /* offline for a moment */
    }
    await sleep(1200 * (i + 1));
  }
  return false;
}
