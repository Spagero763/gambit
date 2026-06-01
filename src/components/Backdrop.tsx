"use client";

import { Aurora } from "./background/Aurora";
import { ParticleField } from "./background/ParticleField";

/**
 * Full-screen ambient backdrop: base void, aurora colour fields, drifting grid,
 * and a canvas particle layer. Sits behind all content.
 */
export function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-void">
      <Aurora />
      <ParticleField />
    </div>
  );
}
