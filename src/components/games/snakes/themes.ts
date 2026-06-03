export interface SnakeTheme {
  id: string;
  label: string;
  boardBg: string; // css background
  border: string; // tailwind border class
  cellLight: string; // rgba
  cellDark: string;
  ladder: string; // hex
  snake: string; // hex
  num: string; // rgba for numbers
  ladderCell: string; // tailwind bg for ladder-foot cells
  snakeCell: string;
}

export const THEMES: SnakeTheme[] = [
  {
    id: "classic",
    label: "Felt",
    boardBg: "radial-gradient(circle at 50% 0%, #1c2a22, #0c1610 70%)",
    border: "border-amber/15",
    cellLight: "rgba(255,255,255,0.05)",
    cellDark: "rgba(0,0,0,0.15)",
    ladder: "#27e1a6",
    snake: "#ff6b9a",
    num: "rgba(255,255,255,0.45)",
    ladderCell: "bg-teal/15",
    snakeCell: "bg-rose/15",
  },
  {
    id: "snow",
    label: "Snow",
    boardBg: "radial-gradient(circle at 50% 0%, #243a55, #0d1726 72%)",
    border: "border-[#8fd7ff]/25",
    cellLight: "rgba(176,224,255,0.12)",
    cellDark: "rgba(10,30,50,0.35)",
    ladder: "#7fd7ff",
    snake: "#c08bff",
    num: "rgba(220,240,255,0.5)",
    ladderCell: "bg-[#7fd7ff]/15",
    snakeCell: "bg-[#c08bff]/15",
  },
  {
    id: "field",
    label: "Field",
    boardBg: "radial-gradient(circle at 50% 0%, #24401f, #0d1c0c 72%)",
    border: "border-[#d9a441]/25",
    cellLight: "rgba(150,200,120,0.12)",
    cellDark: "rgba(10,30,10,0.3)",
    ladder: "#e3b04b",
    snake: "#e0653f",
    num: "rgba(225,240,210,0.5)",
    ladderCell: "bg-[#e3b04b]/15",
    snakeCell: "bg-[#e0653f]/15",
  },
  {
    id: "neon",
    label: "Neon",
    boardBg: "radial-gradient(circle at 50% 0%, #221a4a, #0a0820 72%)",
    border: "border-violet/30",
    cellLight: "rgba(139,125,255,0.12)",
    cellDark: "rgba(0,0,0,0.28)",
    ladder: "#27e1a6",
    snake: "#ff5fa2",
    num: "rgba(200,190,255,0.5)",
    ladderCell: "bg-teal/12",
    snakeCell: "bg-rose/12",
  },
];
