/** A small pulsing dot in the current text colour: whose turn it is. */
export function TurnDot() {
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      <span className="absolute inset-0 rounded-full bg-current" style={{ animation: "ring 1.4s cubic-bezier(0.23,1,0.32,1) infinite" }} />
      <span className="relative h-2 w-2 rounded-full bg-current" />
    </span>
  );
}
