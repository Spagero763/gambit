"use client";

import { useEffect, useState } from "react";

export interface ServerProfile {
  address: string;
  name: string | null;
  avatar: string;
  avatar_image: string | null;
  xp: number;
  streak: number;
  last_played: string | null;
  played: number;
  wins: number;
}

/** Must match the server (api/profile). */
export function profileMessage(address: string) {
  return `Sign in to Gambit\nAddress: ${address.toLowerCase()}`;
}

const tokenKey = (a: string) => `gambit:ptoken:${a.toLowerCase()}`;
export function getToken(address: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(tokenKey(address));
}
function setToken(address: string, token: string) {
  if (typeof window !== "undefined") localStorage.setItem(tokenKey(address), token);
}

export function hasToken(address?: string | null): boolean {
  return !!(address && getToken(address));
}

/** Sign in (prove wallet ownership) to get a session token for playing. */
export async function signIn(
  address: string,
  signMessageAsync: (args: { message: string }) => Promise<string>
): Promise<string> {
  const message = profileMessage(address);
  const signature = await signMessageAsync({ message });
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, message, signature }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Sign-in failed");
  setToken(address, json.token);
  return json.token;
}

export async function fetchProfile(address: string): Promise<ServerProfile | null> {
  try {
    const res = await fetch(`/api/profile?address=${address.toLowerCase()}`);
    if (!res.ok) return null;
    return ((await res.json()).profile as ServerProfile) ?? null;
  } catch {
    return null;
  }
}

export interface ProfileDraft {
  name: string;
  avatar: string;
  avatarImage: string;
  xp: number;
  streak: number;
  lastPlayed: string;
  played: number;
  wins: number;
}

export async function createProfile(
  address: string,
  signMessageAsync: (args: { message: string }) => Promise<string>,
  data: ProfileDraft
): Promise<{ profile: ServerProfile; token: string }> {
  const message = profileMessage(address);
  const signature = await signMessageAsync({ message });
  const res = await fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, message, signature, profile: data }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Could not save profile");
  setToken(address, json.token);
  return json;
}

export async function syncProgress(
  address: string,
  progress: { xp: number; streak: number; lastPlayed: string; played: number; wins: number }
) {
  const token = getToken(address);
  if (!token) return;
  try {
    await fetch("/api/profile/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, progress }),
    });
  } catch {
    /* best-effort */
  }
}

/* ---------------- reactive store ---------------- */

interface ProfileState {
  loading: boolean;
  address: string | null;
  profile: ServerProfile | null;
}

let state: ProfileState = { loading: false, address: null, profile: null };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function setProfileLoading(address: string) {
  state = { loading: true, address: address.toLowerCase(), profile: null };
  emit();
}
export function setProfile(address: string, profile: ServerProfile | null) {
  state = { loading: false, address: address.toLowerCase(), profile };
  emit();
}
export function clearProfile() {
  state = { loading: false, address: null, profile: null };
  emit();
}

export function useProfile() {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((x) => x + 1);
    subs.add(cb);
    return () => {
      subs.delete(cb);
    };
  }, []);
  return { ...state, hasProfile: !!state.profile };
}
