'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Stats } from '@/lib/contract';

interface StandingsProps {
  stats: Stats | null;
  loading: boolean;
}

interface Cell {
  label: string;
  value: number;
  accent?: boolean;
}

/**
 * A slim standings strip woven under the masthead. It reads real global
 * counters from get_stats and pulses crimson whenever fresh on-chain numbers
 * land, so a refresh is felt rather than silent.
 */
export default function Standings({ stats, loading }: StandingsProps) {
  const [pulse, setPulse] = useState(false);
  const prev = useRef<string>('');

  const cells: Cell[] = [
    { label: 'Gauntlets', value: stats?.gauntlets ?? 0 },
    { label: 'In session', value: stats?.open ?? 0, accent: true },
    { label: 'Vindicated', value: stats?.vindicated ?? 0 },
    { label: 'Collapsed', value: stats?.collapsed ?? 0 },
    { label: 'Rulings sealed', value: stats?.rulings ?? 0 },
  ];

  useEffect(() => {
    if (!stats) return;
    const sig = `${stats.gauntlets}-${stats.open}-${stats.vindicated}-${stats.collapsed}-${stats.rulings}`;
    if (prev.current && prev.current !== sig) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1200);
      return () => clearTimeout(t);
    }
    prev.current = sig;
  }, [stats]);

  return (
    <motion.div
      className={`standings ${pulse ? 'pulsing' : ''}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
    >
      {cells.map((c) => (
        <div key={c.label} className={`stat-cell ${c.accent ? 'accent' : ''}`}>
          <span className="stat-num">{loading ? '.' : c.value}</span>
          <span className="stat-label">{c.label}</span>
        </div>
      ))}
    </motion.div>
  );
}
