'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import type { GauntletSummary } from '@/lib/contract';
import { shortAddr, statusLabel, friendlyError } from '@/lib/format';

type Filter = 'all' | 'open' | 'settled';

interface DocketProps {
  gauntlets: GauntletSummary[];
  loading: boolean;
  error: string | null;
  filter: Filter;
  featuredId: string | null;
  onFilter: (f: Filter) => void;
  onSelect: (id: string) => void;
  onRetry: () => void;
}

function statusTagClass(status: string): string {
  if (status === 'VINDICATED') return 'holds';
  if (status === 'COLLAPSED') return 'collapses';
  return 'concedes';
}

const rowReveal = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.04 * i, duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

/**
 * The case docket: every real gauntlet on the contract, listed as a row of
 * files in the rail beside the staged hero. Hover lifts and lights a crimson
 * spine; the staged gauntlet is marked featured.
 */
export default function Docket({
  gauntlets,
  loading,
  error,
  filter,
  featuredId,
  onFilter,
  onSelect,
  onRetry,
}: DocketProps) {
  return (
    <motion.div
      className="rail-panel"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.26 }}
    >
      <div className="rail-panel-head">
        <span className="kicker">Case docket</span>
        <div className="seg seg-sm">
          <button className={filter === 'all' ? 'on' : ''} onClick={() => onFilter('all')}>
            All
          </button>
          <button className={filter === 'open' ? 'on' : ''} onClick={() => onFilter('open')}>
            Open
          </button>
          <button className={filter === 'settled' ? 'on' : ''} onClick={() => onFilter('settled')}>
            Settled
          </button>
        </div>
      </div>

      <div className="rail-panel-body">
        {loading ? (
          [0, 1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: 78 }} />)
        ) : error ? (
          <div className="note-card" style={{ padding: '28px 16px' }}>
            <AlertTriangle size={22} color="var(--crimson)" />
            <h3 style={{ fontSize: '1rem' }}>Could not reach the contract</h3>
            <p style={{ fontSize: '0.84rem', margin: '0 auto 14px' }}>{friendlyError(error)}</p>
            <button className="btn btn-ghost" onClick={onRetry}>
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        ) : gauntlets.length === 0 ? (
          <div className="note-card" style={{ padding: '28px 16px' }}>
            <p style={{ fontSize: '0.86rem', margin: 0 }}>
              No gauntlets match this filter. Open one and the docket fills.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {gauntlets.map((g, i) => (
              <motion.button
                key={g.id}
                layout
                variants={rowReveal}
                custom={i}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -6 }}
                whileHover={{ scale: 1.012 }}
                whileTap={{ scale: 0.99 }}
                className={`case-row ${featuredId === g.id ? 'featured' : ''}`}
                onClick={() => onSelect(g.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className={`verdict-tag ${statusTagClass(g.status)}`} style={{ fontSize: '0.6rem', padding: '3px 8px' }}>
                    {statusLabel(g.status)}
                  </span>
                  <span className="mono" style={{ fontSize: '0.58rem', color: 'var(--bone-faint)' }}>
                    {g.id} . r{Math.min(g.round, g.target_rounds)}/{g.target_rounds}
                  </span>
                </div>
                <div className="case-thesis">{g.thesis}</div>
                <div className="case-foot">
                  <span>{shortAddr(g.challenger)}</span>
                  <div className="meter" style={{ flex: 1, minWidth: 50 }}>
                    <span style={{ width: `${g.conviction}%` }} />
                  </div>
                  <span>{g.conviction}</span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
