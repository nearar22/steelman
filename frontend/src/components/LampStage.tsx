'use client';

import { useEffect, useRef } from 'react';

/**
 * The signature motif: a swaying overhead interrogation-lamp light pool over
 * the dark table, with a faint drifting dust-haze particle layer. Painted on a
 * canvas with requestAnimationFrame, devicePixelRatio-aware, and paused while
 * the tab is hidden.
 */

interface Mote {
  x: number;
  y: number;
  r: number;
  drift: number;
  speed: number;
  phase: number;
  alpha: number;
}

export default function LampStage() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let motes: Mote[] = [];

    const seedMotes = () => {
      const count = Math.min(70, Math.max(28, Math.round((w * h) / 26000)));
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.4 + Math.random() * 1.7,
        drift: 0.2 + Math.random() * 0.8,
        speed: 0.06 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.04 + Math.random() * 0.16,
      }));
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedMotes();
    };

    let raf = 0;
    let running = true;
    let t = 0;

    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, w, h);

      // gentle pendulum sway of the lamp anchored above the top edge
      const sway = Math.sin(t * 0.006) * (w * 0.06);
      const breathe = 0.5 + 0.5 * Math.sin(t * 0.011);
      const cx = w / 2 + sway;
      const cy = -h * 0.06;
      const pool = Math.max(w, h) * (0.72 + breathe * 0.06);

      // the warm light pool falling on the table
      const warm = ctx.createRadialGradient(cx, cy, 0, cx, cy, pool);
      warm.addColorStop(0, `rgba(244, 236, 222, ${0.16 + breathe * 0.05})`);
      warm.addColorStop(0.28, `rgba(244, 236, 222, ${0.07 + breathe * 0.02})`);
      warm.addColorStop(0.55, 'rgba(226, 59, 59, 0.035)');
      warm.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = warm;
      ctx.fillRect(0, 0, w, h);

      // a tight hot core where the bulb throws hardest
      const core = ctx.createRadialGradient(cx, cy + h * 0.04, 0, cx, cy + h * 0.04, pool * 0.32);
      core.addColorStop(0, `rgba(255, 247, 235, ${0.12 + breathe * 0.05})`);
      core.addColorStop(1, 'rgba(255, 247, 235, 0)');
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, w, h);

      // drifting dust caught in the beam
      ctx.save();
      for (const m of motes) {
        m.phase += m.speed * 0.02;
        m.y -= m.speed;
        const wobble = Math.sin(m.phase) * m.drift * 6;
        const px = m.x + wobble + sway * 0.25;
        if (m.y < -6) {
          m.y = h + 6;
          m.x = Math.random() * w;
        }
        // dust is brighter nearer the light pool center
        const dx = px - cx;
        const dy = m.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const lit = Math.max(0, 1 - dist / (pool * 0.85));
        const a = m.alpha * (0.25 + lit * 0.95) * (0.7 + 0.3 * Math.sin(m.phase));
        if (a <= 0.01) continue;
        ctx.beginPath();
        ctx.fillStyle = `rgba(244, 236, 222, ${a})`;
        ctx.arc(px, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (running) raf = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(draw);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    if (reduce) {
      // paint a single static frame, no animation loop
      running = false;
      draw();
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="lamp-canvas" aria-hidden />;
}
