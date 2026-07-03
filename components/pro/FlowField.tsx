"use client";

import { useEffect, useRef } from "react";

// An ambient flow-field of drifting particles — adapted from the swirling
// murmuration reference. Streams curl across the screen and bend around your
// cursor / touch ("动态跟随"). Transparent trails (destination-out fade) so the
// particles float OVER the aurora, not hide it. Tuned subtle + premium, in the
// .pro palette, and cheap: ~130 particles, capped DPR, paused when hidden, and
// disabled under prefers-reduced-motion.
export default function FlowField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const canvasEl = canvasRef.current;
    const context = canvasEl?.getContext("2d", { alpha: true });
    if (!canvasEl || !context) return;
    // Non-null aliases so the nested rAF/resize closures keep the narrowing.
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = context;

    const COLORS = [
      [139, 146, 238], // violet
      [124, 206, 224], // cyan
      [150, 199, 170], // sage
      [238, 197, 138], // amber
      [232, 150, 162], // rose
    ];

    let w = 0;
    let h = 0;
    let dpr = 1;
    const isLight = () => document.documentElement.classList.contains("light");

    type P = { x: number; y: number; px: number; py: number; c: number[]; life: number };
    let particles: P[] = [];
    const COUNT = 175;

    function reset(p: P) {
      p.x = Math.random() * w;
      p.y = Math.random() * h;
      p.px = p.x;
      p.py = p.y;
      p.c = COLORS[(Math.random() * COLORS.length) | 0];
      p.life = 80 + Math.random() * 220;
    }
    function seed() {
      particles = Array.from({ length: COUNT }, () => {
        const p: P = { x: 0, y: 0, px: 0, py: 0, c: COLORS[0], life: 0 };
        reset(p);
        return p;
      });
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
    }

    // Smooth swirling angle field (layered trig — no noise lib needed).
    function flow(x: number, y: number, t: number) {
      return (
        (Math.sin(x * 0.0016 + t * 0.00022) +
          Math.cos(y * 0.0016 - t * 0.00016) +
          Math.sin((x + y) * 0.0011 + t * 0.00012)) *
        Math.PI
      );
    }

    const ptr = { x: -1, y: -1, active: false };
    const onMove = (cx: number, cy: number) => {
      ptr.x = cx;
      ptr.y = cy;
      ptr.active = true;
    };
    const mouse = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const touch = (e: TouchEvent) => {
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const leave = () => (ptr.active = false);

    let raf = 0;
    function tick(t: number) {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;

      const light = isLight();
      // fade old trails toward transparent (keeps aurora/bg visible underneath)
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${light ? 0.1 : 0.085})`;
      ctx.fillRect(0, 0, w, h);
      // additive glow on dark so the streams read luminous; plain over on light
      ctx.globalCompositeOperation = light ? "source-over" : "lighter";

      const speed = 1.1;
      const R = 200; // pointer influence radius
      const baseAlpha = light ? 0.32 : 0.34;
      ctx.lineWidth = light ? 1.2 : 1.4;
      ctx.lineCap = "round";

      for (const p of particles) {
        p.px = p.x;
        p.py = p.y;
        let a = flow(p.x, p.y, t);

        if (ptr.active) {
          const dx = p.x - ptr.x;
          const dy = p.y - ptr.y;
          const dist = Math.hypot(dx, dy);
          if (dist < R) {
            const k = 1 - dist / R; // swirl tangentially, strongest up close
            const tangent = Math.atan2(dy, dx) + Math.PI / 2;
            a = a * (1 - k) + tangent * k;
          }
        }

        p.x += Math.cos(a) * speed;
        p.y += Math.sin(a) * speed;
        p.life--;

        if (p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10 || p.life <= 0) {
          reset(p);
          continue;
        }
        ctx.strokeStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${baseAlpha})`;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";
      // soft luminous orb trailing the pointer
      if (ptr.active) {
        const g = ctx.createRadialGradient(ptr.x, ptr.y, 0, ptr.x, ptr.y, 140);
        g.addColorStop(0, `rgba(139,146,238,${isLight() ? 0.08 : 0.14})`);
        g.addColorStop(1, "rgba(139,146,238,0)");
        ctx.fillStyle = g;
        ctx.fillRect(ptr.x - 140, ptr.y - 140, 280, 280);
      }
    }

    resize();
    seed();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", mouse);
    window.addEventListener("touchmove", touch, { passive: true });
    window.addEventListener("touchend", leave);
    window.addEventListener("mouseleave", leave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", mouse);
      window.removeEventListener("touchmove", touch);
      window.removeEventListener("touchend", leave);
      window.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ zIndex: 2 }}
      className="pointer-events-none fixed inset-0 h-full w-full"
    />
  );
}
