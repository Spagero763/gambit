export type Difficulty = "easy" | "normal" | "hard";

export const DIFFICULTIES: { id: Difficulty; label: string; blurb: string }[] = [
  { id: "easy", label: "Easy", blurb: "Relaxed. Good for learning." },
  { id: "normal", label: "Normal", blurb: "A fair, steady opponent." },
  { id: "hard", label: "Hard", blurb: "Sharp and punishing." },
];

/** Games where picking a difficulty is meaningful. */
export const SUPPORTS_DIFFICULTY = new Set(["chess", "tic-tac-toe", "snakes"]);
