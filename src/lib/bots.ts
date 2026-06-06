/** Named bot opponents with distinct looks, so playing vs AI feels like
 *  playing a person rather than "Gambit AI". Faces are drawn by <BotFace>. */
export interface Bot {
  id: string;
  name: string;
  bg: string; // avatar background
  skin: string;
  hair: string;
  style: 0 | 1 | 2; // hairstyle variant
  accent?: string; // optional glasses/brow accent
}

export const BOTS: Bot[] = [
  { id: "sage", name: "Sage", bg: "#5d58c9", skin: "#e8b98f", hair: "#2b2b33", style: 0 },
  { id: "tunde", name: "Tunde", bg: "#1f9d6b", skin: "#8d5a3c", hair: "#16161a", style: 1 },
  { id: "mira", name: "Mira", bg: "#d99633", skin: "#f0c9a0", hair: "#5a3b22", style: 2 },
  { id: "kofi", name: "Kofi", bg: "#c2557a", skin: "#7a4a2f", hair: "#141419", style: 0 },
  { id: "lina", name: "Lina", bg: "#3a8fbf", skin: "#edc1a2", hair: "#3a2a55", style: 2 },
  { id: "dotun", name: "Dotun", bg: "#6f9b3c", skin: "#9c6b44", hair: "#16161a", style: 1 },
  { id: "ada", name: "Ada", bg: "#b06bd0", skin: "#e0a87e", hair: "#241a3a", style: 2 },
  { id: "rex", name: "Rex", bg: "#3f6fd1", skin: "#caa07a", hair: "#15151a", style: 1 },
];

/** Deterministic-ish picker so a session's opponents are stable but varied. */
export function pickBots(n: number, seed = Date.now()): Bot[] {
  const pool = [...BOTS];
  const out: Bot[] = [];
  let s = seed;
  const rng = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < n && pool.length; i++) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
}

export function randomBot(seed = Date.now()): Bot {
  return pickBots(1, seed)[0];
}
