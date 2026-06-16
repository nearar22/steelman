'use client';

import { motion } from 'framer-motion';
import type { GauntletDetail } from '@/lib/contract';
import { rulingLabel, shortAddr } from '@/lib/format';

interface TranscriptProps {
  g: GauntletDetail;
}

export default function Transcript({ g }: TranscriptProps) {
  return (
    <div>
      {g.rounds.length === 0 && g.status === 'OPEN' && (
        <div className="kicker" style={{ marginBottom: 14 }}>
          Round 1 of {g.target_rounds}
        </div>
      )}

      {g.rounds.map((r) => (
        <div key={r.round}>
          <div className="kicker" style={{ margin: '20px 0 4px', color: 'var(--bone-faint)' }}>
            Round {r.round}
          </div>

          <motion.div
            className="turn adversary"
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="speaker">Adversary</div>
            <div className="line">{r.rebuttal}</div>
          </motion.div>

          <motion.div
            className="turn challenger"
            initial={{ opacity: 0, x: 8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="speaker">{shortAddr(g.challenger)}</div>
            <div className="line">{r.defense}</div>
          </motion.div>

          <div
            className="turn adversary"
            style={{ borderBottom: '1px dashed var(--line)', alignItems: 'flex-start' }}
          >
            <div className="speaker">Ruling</div>
            <div className="line">
              <span className={`verdict-tag ${r.ruling.toLowerCase()}`}>{rulingLabel(r.ruling)}</span>
              <span className="mono" style={{ marginLeft: 10, fontSize: '0.72rem', color: 'var(--bone-dim)' }}>
                conviction {r.conviction}/100
              </span>
              <div style={{ marginTop: 8, color: 'var(--bone-dim)', fontStyle: 'italic' }}>
                {r.rationale}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* standing rebuttal awaiting a defense */}
      {g.status === 'OPEN' && g.awaiting_defense && (
        <motion.div
          className="turn adversary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="speaker">Adversary</div>
          <div className="line">
            <div className="kicker" style={{ color: 'var(--crimson)', marginBottom: 6 }}>
              Round {g.round} of {g.target_rounds} . awaiting your defense
            </div>
            {g.pending_rebuttal}
          </div>
        </motion.div>
      )}

      {g.status !== 'OPEN' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            margin: '26px 0 0',
            padding: '22px',
            border: `1px solid ${g.status === 'VINDICATED' ? 'rgba(111,185,143,0.4)' : 'rgba(226,59,59,0.4)'}`,
            borderRadius: 'var(--radius)',
            background: g.status === 'VINDICATED' ? 'rgba(111,185,143,0.06)' : 'rgba(226,59,59,0.06)',
            textAlign: 'center',
          }}
        >
          <div
            className="display"
            style={{
              fontWeight: 800,
              fontSize: '1.8rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: g.status === 'VINDICATED' ? 'var(--hold)' : 'var(--collapse)',
            }}
          >
            {g.status === 'VINDICATED' ? 'Thesis vindicated' : 'Thesis collapsed'}
          </div>
          <p style={{ color: 'var(--bone-dim)', margin: '10px auto 0', maxWidth: '52ch' }}>
            {g.outcome_rationale}
          </p>
          <div className="mono" style={{ fontSize: '0.66rem', color: 'var(--bone-faint)', marginTop: 12 }}>
            final conviction {g.conviction}/100 over {g.rounds.length} round
            {g.rounds.length === 1 ? '' : 's'}
          </div>
        </motion.div>
      )}
    </div>
  );
}
