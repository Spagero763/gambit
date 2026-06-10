"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AVATAR_HEX } from "@/lib/settings";

/** Public face of a player — what everyone else sees instead of a 0x address. */
export interface PublicProfile {
  address: string;
  name: string | null;
  avatar: string;
  avatar_image: string | null;
}

const cache = new Map<string, PublicProfile | null>();

export function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** The name to render for an address — profile name first, short 0x as fallback. */
export function displayName(addr: string, p?: PublicProfile | null) {
  return p?.name?.trim() || shortAddr(addr);
}

/** Avatar colour hex for a profile (falls back to brand teal). */
export function avatarHex(p?: PublicProfile | null) {
  return (p && AVATAR_HEX[p.avatar]) || AVATAR_HEX.teal || "#3ecf8e";
}

/**
 * Batch-resolve profiles for a set of addresses (public read, cached).
 * Returns a lowercase-address → profile map that fills in as data arrives.
 */
export function useProfiles(addresses: string[]) {
  const key = useMemo(
    () => Array.from(new Set(addresses.map((a) => a.toLowerCase()))).sort().join(","),
    [addresses]
  );
  const [map, setMap] = useState<Record<string, PublicProfile>>({});

  useEffect(() => {
    const list = key ? key.split(",") : [];
    if (list.length === 0 || !supabase) return;

    // serve what we have instantly
    const have: Record<string, PublicProfile> = {};
    const missing: string[] = [];
    for (const a of list) {
      const hit = cache.get(a);
      if (hit) have[a] = hit;
      else if (!cache.has(a)) missing.push(a);
    }
    if (Object.keys(have).length) setMap((m) => ({ ...m, ...have }));
    if (missing.length === 0) return;

    let active = true;
    (async () => {
      const { data } = await supabase!
        .from("profiles")
        .select("address,name,avatar,avatar_image")
        .in("address", missing);
      if (!active) return;
      const found: Record<string, PublicProfile> = {};
      for (const row of (data as PublicProfile[]) ?? []) {
        const a = row.address.toLowerCase();
        cache.set(a, row);
        found[a] = row;
      }
      for (const a of missing) if (!found[a]) cache.set(a, null); // remember misses
      if (Object.keys(found).length) setMap((m) => ({ ...m, ...found }));
    })();
    return () => {
      active = false;
    };
  }, [key]);

  return map;
}
