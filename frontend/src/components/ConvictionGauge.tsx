'use client';

import { motion } from 'framer-motion';

interface ConvictionGaugeProps {
  value: number; // 0-100
  size?: number;
  label?: string;
}

/**
 * A prominent animated conviction gauge: a 240deg arc dial that sweeps the
 * needle up to the current conviction and glows crimson at the tip. This is the
 * vital sign of the interrogation, read at a glance under the lamp.
 */
export default function ConvictionGauge({ value, size = 132, label = 'conviction' }: ConvictionGaugeProps) {
  const v = Math.max(0, Math.min(100, value));
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  // a 270deg sweep from 135deg (bottom-left) clockwise to 405deg (bottom-right)
  const START = 135;
  const SWEEP = 270;
  const circumference = 2 * Math.PI * r;
  const arcLen = (SWEEP / 360) * circumference;
  const filled = (v / 100) * arcLen;

  return (
    <div className="gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <defs>
          <linearGradient id="gauge-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--crimson-deep)" />
            <stop offset="100%" stopColor="var(--crimson-2)" />
          </linearGradient>
        </defs>
        {/* track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--ink-3)"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circumference}`}
          transform={`rotate(${START} ${cx} ${cy})`}
        />
        {/* filled arc */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="url(#gauge-fill)"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`0 ${circumference}`}
          transform={`rotate(${START} ${cx} ${cy})`}
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${filled} ${circumference}` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          style={{ filter: 'drop-shadow(0 0 6px var(--crimson-glow-2))' }}
        />
      </svg>
      <div className="gauge-center">
        <span className="gauge-num">{v}</span>
        <span className="gauge-label">{label}</span>
      </div>
    </div>
  );
}
