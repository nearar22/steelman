'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { GauntletDetail } from '@/lib/contract';
import { rulingLabel, shortAddr } from '@/lib/format';

interface TranscriptProps {
  g: GauntletDetail;
}

// staggered fade rhythm so dialogue lines reveal in sequence under the lamp
const reveal = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

function stampWord(status: string): string {
  return status === 'VINDICATED' ? 'HOLDS' : 'COLLAPSES';
}

export default function Transcript({ g }: TranscriptProps) {
  return (
    <div className="transcript-log">
      {g.rounds.length === 0 && g.status === 'OPEN' && (
        <div className="round-marker">
          <span>Round 1 of {g.target_rounds}</span>
        </div>
      )}

      {g.rounds.map((r) => (
        <div key={r.round}>
          <div className="round-marker">
            <span>Round {r.round}</span>
          </div>

          <motion.div
            className="turn adversary"
            variants={reveal}
            custom={0}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="speaker">Adversary</div>
            <div className="line">{r.rebuttal}</div>
          </motion.div>

          <motion.div
            className="turn challenger"
            variants={reveal}
            custom={1}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="speaker">{shortAddr(g.challenger)}</div>
            <div className="line">{r.defense}</div>
          </motion.div>

          <motion.div
            className="turn ruling"
            variants={reveal}
            custom={2}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="speaker">Ruling</div>
            <div className="line">
              <span className={`verdict-tag ${r.ruling.toLowerCase()}`}>{rulingLabel(r.ruling)}</span>
              <span className="mono" style={{ marginLeft: 10, fontSize: '0.72rem', color: 'var(--bone-dim)' }}>
                conviction {r.conviction}/100
              </span>
              <div className="meter" style={{ maxWidth: 240, margin: '10px auto 0' }}>
                <motion.span
                  initial={{ width: 0 }}
                  whileInView={{ width: `${r.conviction}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <div style={{ marginTop: 10, color: 'var(--bone-dim)', fontStyle: 'italic' }}>
                {r.rationale}
              </div>
            </div>
          </motion.div>
        </div>
      ))}

      {/* standing rebuttal awaiting a defense */}
      {g.status === 'OPEN' && g.awaiting_defense && (
        <>
          <div className="round-marker">
            <span>
              Round {g.round} of {g.target_rounds} . awaiting defense
            </span>
          </div>
          <motion.div
            className="turn adversary"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="speaker">Adversary</div>
            <div className="line">
              <div className="kicker" style={{ color: 'var(--crimson)', marginBottom: 6 }}>
                The chair must answer
              </div>
              {g.pending_rebuttal}
            </div>
          </motion.div>
        </>
      )}

      <AnimatePresence>
        {g.status !== 'OPEN' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1, x: [0, -6, 5, -4, 3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ x: { duration: 0.5, delay: 0.18 } }}
            style={{
              position: 'relative',
              overflow: 'hidden',
              margin: '30px 0 0',
              padding: '36px 22px',
              border: `1px solid ${g.status === 'VINDICATED' ? 'rgba(111,185,143,0.4)' : 'rgba(226,59,59,0.4)'}`,
              borderRadius: 'var(--radius)',
              background: g.status === 'VINDICATED' ? 'rgba(111,185,143,0.06)' : 'rgba(226,59,59,0.06)',
              textAlign: 'center',
            }}
          >
            {/* a hard flash the instant the stamp lands */}
            <motion.span
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 0.5, delay: 0.15, times: [0, 0.16, 1] }}
              style={{
                position: 'absolute',
                inset: 0,
                background: g.status === 'VINDICATED' ? 'var(--hold)' : 'var(--collapse)',
                mixBlendMode: 'screen',
                pointerEvents: 'none',
              }}
            />
            <motion.div
              className={`stamp ${g.status === 'VINDICATED' ? 'stamp-hold' : 'stamp-collapse'}`}
              initial={{ opacity: 0, scale: 2.4, rotate: -18 }}
              animate={{ opacity: 1, scale: 1, rotate: -9 }}
              transition={{ type: 'spring', stiffness: 220, damping: 12, delay: 0.15 }}
              aria-hidden
            >
              {stampWord(g.status)}
            </motion.div>
            <div
              className="display"
              style={{
                position: 'relative',
                fontWeight: 800,
                fontSize: '1.9rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: g.status === 'VINDICATED' ? 'var(--hold)' : 'var(--collapse)',
              }}
            >
              {g.status === 'VINDICATED' ? 'Thesis vindicated' : 'Thesis collapsed'}
            </div>
            <p style={{ position: 'relative', color: 'var(--bone-dim)', margin: '10px auto 0', maxWidth: '52ch' }}>
              {g.outcome_rationale}
            </p>
            <div className="mono" style={{ position: 'relative', fontSize: '0.66rem', color: 'var(--bone-faint)', marginTop: 12 }}>
              final conviction {g.conviction}/100 over {g.rounds.length} round
              {g.rounds.length === 1 ? '' : 's'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
