'use client';

import { useEffect, useRef } from 'react';

/**
 * The signature motif, painted on a canvas: a swaying overhead interrogation
 * lamp that throws a hard volumetric cone of light down onto a textured table,
 * pooling into a hot ellipse, with drifting dust motes caught in the beam and a
 * faint bulb flicker. devicePixelRatio-aware, paused while the tab is hidden,
 * and reduced to a single static frame under prefers-reduced-motion.
 *
 * This is deliberately strong: the cone and the table pool are the brightest
 * thing on the page so a screenshot reads instantly as a lit interrogation
 * scene rather than a flat dark field.
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
      const count = Math.min(150, Math.max(60, Math.round((w * h) / 13000)));
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.4 + Math.random() * 2.1,
        drift: 0.2 + Math.random() * 0.9,
        speed: 0.05 + Math.random() * 0.26,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.05 + Math.random() * 0.22,
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

      // ---- lamp position: a gentle pendulum sway anchored above the frame ---
      const sway = Math.sin(t * 0.006) * (w * 0.05);
      const breathe = 0.5 + 0.5 * Math.sin(t * 0.013);
      // a faint, fast bulb flicker layered on top of the slow breathe
      const flicker =
        0.92 +
        0.08 * Math.sin(t * 0.5) +
        0.04 * Math.sin(t * 1.7 + 1.3) +
        (Math.random() < 0.012 ? -0.12 : 0);
      const cx = w / 2 + sway;
      const cy = -h * 0.08; // bulb sits just above the top edge
      const tableY = h * 0.96; // where the pool lands on the table
      const pool = Math.max(w, h) * (0.74 + breathe * 0.05);

      // ---- 1. the volumetric cone of light from the bulb to the table ------
      // drawn as a soft triangle gradient so the beam is a visible shaft
      const topHalf = w * 0.05;
      const botHalf = w * 0.42;
      const beamGrad = ctx.createLinearGradient(0, cy, 0, tableY);
      beamGrad.addColorStop(0, `rgba(255, 246, 230, ${0.22 * flicker})`);
      beamGrad.addColorStop(0.35, `rgba(248, 238, 222, ${0.12 * flicker})`);
      beamGrad.addColorStop(0.75, `rgba(226, 170, 120, ${0.05 * flicker})`);
      beamGrad.addColorStop(1, 'rgba(226, 90, 70, 0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.moveTo(cx - topHalf, cy);
      ctx.lineTo(cx + topHalf, cy);
      ctx.lineTo(cx + botHalf, tableY);
      ctx.lineTo(cx - botHalf, tableY);
      ctx.closePath();
      ctx.fillStyle = beamGrad;
      ctx.fill();
      ctx.restore();

      // ---- 2. the warm wash falling from the bulb -------------------------
      const warm = ctx.createRadialGradient(cx, cy, 0, cx, cy, pool);
      warm.addColorStop(0, `rgba(255, 244, 226, ${(0.26 + breathe * 0.06) * flicker})`);
      warm.addColorStop(0.26, `rgba(246, 232, 210, ${(0.12 + breathe * 0.03) * flicker})`);
      warm.addColorStop(0.52, 'rgba(226, 120, 80, 0.05)');
      warm.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = warm;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // ---- 3. the hot pool where the cone strikes the table ----------------
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(cx, tableY);
      ctx.scale(1, 0.34); // flatten the pool into an ellipse on the table
      const poolGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, botHalf * 1.15);
      poolGrad.addColorStop(0, `rgba(255, 247, 232, ${0.5 * flicker})`);
      poolGrad.addColorStop(0.4, `rgba(244, 224, 198, ${0.22 * flicker})`);
      poolGrad.addColorStop(0.75, 'rgba(214, 120, 80, 0.06)');
      poolGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = poolGrad;
      ctx.beginPath();
      ctx.arc(0, 0, botHalf * 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ---- 4. a tight hot core right under the bulb ------------------------
      const core = ctx.createRadialGradient(cx, cy + h * 0.05, 0, cx, cy + h * 0.05, pool * 0.3);
      core.addColorStop(0, `rgba(255, 250, 240, ${(0.2 + breathe * 0.06) * flicker})`);
      core.addColorStop(1, 'rgba(255, 250, 240, 0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // ---- 5. drifting dust caught in the beam -----------------------------
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const m of motes) {
        m.phase += m.speed * 0.02;
        m.y -= m.speed;
        const wobble = Math.sin(m.phase) * m.drift * 7;
        const px = m.x + wobble + sway * 0.3;
        if (m.y < -8) {
          m.y = h + 8;
          m.x = Math.random() * w;
        }
        // how far the mote is from the beam centerline at its height
        const frac = (m.y - cy) / (tableY - cy);
        const halfAtY = topHalf + (botHalf - topHalf) * Math.max(0, Math.min(1, frac));
        const inBeam = Math.max(0, 1 - Math.abs(px - cx) / (halfAtY + 1));
        const lit = inBeam * inBeam;
        const a = m.alpha * (0.12 + lit * 1.1) * (0.7 + 0.3 * Math.sin(m.phase)) * flicker;
        if (a <= 0.012) continue;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 245, 228, ${a})`;
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
