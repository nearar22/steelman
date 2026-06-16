'use client';

import { motion } from 'framer-motion';
import type { LeaderDraft } from '@/lib/tx';
import { rulingLabel } from '@/lib/format';

interface ConsensusTheaterProps {
  liveStatus: string;
  draft: LeaderDraft | null;
  hash: string | null;
  explorerBase: string;
}

const STAGES = [
  { key: 'submitted', label: 'Statement entered into evidence' },
  { key: 'leader', label: 'Adversary drafts the ruling' },
  { key: 'validators', label: 'Validators re-run the interrogation' },
  { key: 'sealed', label: 'Ruling sealed under consensus' },
];

function stageIndex(status: string): number {
  switch (status) {
    case 'PENDING':
      return 0;
    case 'PROPOSING':
      return 1;
    case 'COMMITTING':
    case 'REVEALING':
    case 'LEADER_TIMEOUT':
    case 'VALIDATORS_TIMEOUT':
      return 2;
    case 'ACCEPTED':
    case 'FINALIZED':
      return 3;
    default:
      return 0;
  }
}

export default function ConsensusTheater({
  liveStatus,
  draft,
  hash,
  explorerBase,
}: ConsensusTheaterProps) {
  const active = stageIndex(liveStatus);
  const rotating = liveStatus === 'LEADER_TIMEOUT' || liveStatus === 'VALIDATORS_TIMEOUT';

  return (
    <div className="theater">
      <motion.div
        className="lamp-orb"
        animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.04, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="kicker" style={{ color: 'var(--crimson)' }}>
        The adversary deliberates
      </div>
      <p style={{ color: 'var(--bone-dim)', margin: '8px 0 0', fontSize: '0.95rem' }}>
        {rotating
          ? 'A validator timed out. The network is rotating the leader and retrying. This is normal, the ruling is still being decided.'
          : 'Validators are independently re-running the ruling. A round takes one to five minutes to settle.'}
      </p>

      <div className="stage-list">
        {STAGES.map((s, i) => {
          const cls = i < active ? 'done' : i === active ? 'active' : '';
          return (
            <div key={s.key} className={`stage-item ${cls}`}>
              <span className="stage-num">{i < active ? '+' : i + 1}</span>
              {s.label}
            </div>
          );
        })}
      </div>

      <div className="mono" style={{ fontSize: '0.64rem', color: 'var(--bone-faint)', marginTop: 16 }}>
        status: {liveStatus}
        {hash && (
          <>
            {'  '}
            <a
              href={`${explorerBase}/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--bone-dim)', borderBottom: '1px solid var(--crimson)' }}
            >
              view transaction
            </a>
          </>
        )}
      </div>

      {draft && (draft.ruling || draft.rebuttal) && (
        <motion.div
          className="draft-peek"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="pk-label">Leader draft, sealing under consensus</div>
          {draft.ruling && (
            <div style={{ marginBottom: 6 }}>
              <span className={`verdict-tag ${draft.ruling.toLowerCase()}`}>
                {rulingLabel(draft.ruling)}
              </span>
              {typeof draft.conviction === 'number' && (
                <span className="mono" style={{ marginLeft: 10, fontSize: '0.72rem', color: 'var(--bone-dim)' }}>
                  conviction {draft.conviction}/100
                </span>
              )}
            </div>
          )}
          <div style={{ fontSize: '0.95rem', lineHeight: 1.55, color: 'var(--bone)' }}>
            {draft.rationale || draft.rebuttal}
          </div>
        </motion.div>
      )}
    </div>
  );
}
