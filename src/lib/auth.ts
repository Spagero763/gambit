"use client";

import { useSyncExternalStore } from "react";

// Web sign-in (Privy) without paying for it on every load. The SDK is several
// hundred KB that MiniPay never needs and a first visit doesn't either, so it
// loads only when someone taps Sign in, or at idle when a Privy session is
// already saved. Screens read this store instead of Privy directly.

export interface AuthState {
  /** false only while a saved session is being restored */
  ready: boolean;
  authenticated: boolean;
  // Privy's user object, loosely typed so its types don't pull the SDK in
  user: any | null;
}

interface AuthApi {
  login: () => void;
  logout: () => Promise<void>;
  exportWallet: (o: { address: string }) => Promise<void>;
}

let state: AuthState = { ready: false, authenticated: false, user: null };
let api: AuthApi | null = null;
let wanted = false;
let loginQueued = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function setAuthState(next: Partial<AuthState>) {
  state = { ...state, ...next };
  emit();
}

/** The Privy layer registers its functions once it has mounted. */
export function setAuthApi(next: AuthApi | null) {
  api = next;
  if (api && loginQueued) {
    loginQueued = false;
    api.login();
  }
}

/** Ask for the Privy layer to be loaded. */
export function wantPrivy() {
  if (wanted) return;
  wanted = true;
  emit();
}
export const privyWanted = () => wanted;

export function savedPrivySession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? "";
      if (k.startsWith("privy:") && /token|connections/.test(k)) return true;
    }
  } catch {
    /* storage blocked: nothing saved to restore */
  }
  return false;
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};
const server: AuthState = { ready: false, authenticated: false, user: null };

export function useAuth() {
  const s = useSyncExternalStore(subscribe, () => state, () => server);
  return {
    ...s,
    login: () => {
      if (api) return api.login();
      loginQueued = true;
      wantPrivy();
    },
    logout: () => api?.logout() ?? Promise.resolve(),
    exportWallet: (o: { address: string }) => api?.exportWallet(o) ?? Promise.resolve(),
  };
}

/** Re-renders when the Privy layer is asked for. */
export function usePrivyWanted() {
  return useSyncExternalStore(subscribe, privyWanted, () => false);
}
