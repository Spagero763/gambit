"use client";

import { useEffect, useRef } from "react";

interface P {
  x: number;
  y: number;
  z: number; // depth 0.3..1 for parallax + size
  vx: number;
  vy: number;
  tw: number; // twinkle phase
}

/**
 * Lightweight canvas starfield. Slow drift, gentle twinkle, and a subtle
 * pointer parallax. Caps particle count and honours reduced-motion.
 */
export function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0;
    let h = 0;
    let particles: P[] = [];
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const COLORS = ["139,125,255", "39,225,166", "255,193,94"];

    function resize() {
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.floor((w * h) / 14000));
      particles = Array.from({ length: count }, (_, i) => ({
        x: pseudo(i * 1.3) * w,
        y: pseudo(i * 2.7) * h,
        z: 0.3 + pseudo(i * 3.9) * 0.7,
        vx: (pseudo(i * 4.1) - 0.5) * 0.08,
        vy: (pseudo(i * 5.3) - 0.5) * 0.08,
        tw: pseudo(i * 6.7) * Math.PI * 2,
      }));
    }

    // deterministic pseudo-random so layout is stable without Math.random seeds
    function pseudo(n: number) {
      const s = Math.sin(n * 99.13) * 43758.5453;
      return s - Math.floor(s);
    }

    let t = 0;
    let raf = 0;
    function frame() {
      t += 0.016;
      ctx!.clearRect(0, 0, w, h);
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!reduce) {
          p.x += p.vx * p.z;
          p.y += p.vy * p.z;
        }
        // wrap
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
        if (p.y < -4) p.y = h + 4;
        if (p.y > h + 4) p.y = -4;

        const px = p.x + pointer.x * p.z * 18;
        const py = p.y + pointer.y * p.z * 18;
        const twinkle = reduce ? 0.6 : 0.45 + 0.55 * Math.sin(t * 1.5 + p.tw);
        const r = p.z * 1.6;
        const color = COLORS[i % COLORS.length];

        ctx!.beginPath();
        ctx!.arc(px, py, r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${color},${(0.18 + p.z * 0.5) * twinkle})`;
        ctx!.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    function onMove(e: PointerEvent) {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }

    resize();
    frame();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
