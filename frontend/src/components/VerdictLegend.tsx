'use client';

import { motion } from 'framer-motion';

const ROWS = [
  {
    cls: 'holds',
    name: 'Holds',
    desc: 'The defense answered on the merits. The thesis stands another round.',
  },
  {
    cls: 'concedes',
    name: 'Concedes',
    desc: 'A point was given up but the thesis survives, wounded, into the next round.',
  },
  {
    cls: 'collapses',
    name: 'Collapses',
    desc: 'The defense failed or tried to manipulate the Adversary. The gauntlet ends at once.',
  },
];

/**
 * A compact verdict legend so a first-time visitor can read any ruling in the
 * docket without entering a gauntlet.
 */
export default function VerdictLegend() {
  return (
    <motion.div
      className="rail-panel"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="rail-panel-head">
        <span className="kicker">Verdict legend</span>
      </div>
      <div className="legend">
        {ROWS.map((r) => (
          <div key={r.cls} className="legend-row">
            <span className={`dot-v ${r.cls}`} aria-hidden />
            <div>
              <div className={`lg-name`} style={{ color: `var(--${r.cls === 'holds' ? 'hold' : r.cls === 'concedes' ? 'concede' : 'collapse'})` }}>
                {r.name}
              </div>
              <div className="lg-desc">{r.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
