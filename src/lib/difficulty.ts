export type Difficulty = "easy" | "normal" | "hard";

export const DIFFICULTIES: { id: Difficulty; label: string; blurb: string }[] = [
  { id: "easy", label: "Easy", blurb: "Loose play. Good to learn on." },
  { id: "normal", label: "Normal", blurb: "A solid, even match." },
  { id: "hard", label: "Hard", blurb: "Tight. No charity." },
];

export const SUPPORTS_DIFFICULTY = new Set(["chess", "tic-tac-toe", "snakes"]);
