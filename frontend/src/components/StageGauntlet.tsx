'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Gavel, Scale } from 'lucide-react';
import TypeLine from './TypeLine';
import type { GauntletSummary, GauntletDetail } from '@/lib/contract';
import { shortAddr, statusLabel } from '@/lib/format';

interface StageGauntletProps {
  summary: GauntletSummary;
  detail: GauntletDetail | null;
  onEnter: () => void;
  onOpenNew: () => void;
}

function statusTagClass(status: string): string {
  if (status === 'VINDICATED') return 'holds';
  if (status === 'COLLAPSED') return 'collapses';
  return 'concedes';
}

/**
 * The hero surface: the active gauntlet staged center under the lamp. The
 * latest exchange types itself out as an interrogation, the Adversary and the
 * challenger set as opposing speakers, with an animated conviction meter. This
 * is the star of the composition, never a tiny card.
 */
export default function StageGauntlet({ summary, detail, onEnter, onOpenNew }: StageGauntletProps) {
  // prefer the richer detail when it has loaded, else the summary
  const conviction = detail?.conviction ?? summary.conviction;
  const status = detail?.status ?? summary.status;
  const thesis = detail?.thesis ?? summary.thesis;
  const stance = detail?.stance ?? summary.stance;

  // pull the most relevant exchange: the last sealed round, or the standing rebuttal
  const lastRound = detail && detail.rounds.length > 0 ? detail.rounds[detail.rounds.length - 1] : null;
  const adversaryLine =
    detail?.awaiting_defense && detail.pending_rebuttal
      ? detail.pending_rebuttal
      : lastRound?.rebuttal ?? '';
  const challengerLine = lastRound?.defense ?? '';
  const awaiting = !!detail?.awaiting_defense;

  return (
    <motion.section
      className="stage"
      initial={{ opacity: 0, y: 22, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
    >
      <div className="stage-tag">
        <span className={`verdict-tag ${statusTagClass(status)}`}>{statusLabel(status)}</span>
        <span>
          {summary.id} . round {Math.min(summary.round, summary.target_rounds)}/{summary.target_rounds}
        </span>
        <span style={{ opacity: 0.5 }}>.</span>
        <span>challenger {shortAddr(summary.challenger)}</span>
      </div>

      <h2 className="stage-thesis">{thesis}</h2>
      {stance && (
        <p className="stage-stance">
          <Scale size={13} style={{ verticalAlign: -1, marginRight: 6, color: 'var(--crimson)' }} />
          Defending: {stance}
        </p>
      )}

      <div className="stage-conviction">
        <span className="mono" style={{ fontSize: '0.66rem', color: 'var(--bone-faint)', whiteSpace: 'nowrap' }}>
          conviction {conviction}/100
        </span>
        <div className="meter tall" style={{ flex: 1 }}>
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: `${conviction}%` }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          />
        </div>
      </div>

      <div className="exchange">
        {adversaryLine ? (
          <motion.div
            className="exch-line adversary"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="who">Adversary</div>
            <div className="said">
              <TypeLine text={adversaryLine} startDelay={650} speed={12} />
            </div>
          </motion.div>
        ) : (
          <div className="exch-line adversary">
            <div className="who">Adversary</div>
            <div className="said muted">The opening rebuttal is being drafted under consensus.</div>
          </div>
        )}

        {challengerLine && (
          <motion.div
            className="exch-line challenger"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="who">Challenger</div>
            <div className="said">{challengerLine}</div>
          </motion.div>
        )}

        {awaiting && (
          <motion.div
            className="exch-line challenger"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <div className="who">Challenger</div>
            <div className="said muted" style={{ fontStyle: 'italic' }}>
              The chair is waiting for a defense.
            </div>
          </motion.div>
        )}
      </div>

      <div className="stage-cta">
        <button className="btn btn-primary btn-lg" onClick={onEnter}>
          <Gavel size={16} /> Enter the interrogation <ArrowRight size={15} />
        </button>
        <button className="btn" onClick={onOpenNew}>
          Open your own gauntlet
        </button>
      </div>
    </motion.section>
  );
}
