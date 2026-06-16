'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Gavel, Plus, RefreshCw, ArrowLeft, Send, AlertTriangle, Scale } from 'lucide-react';

import Header from '@/components/Header';
import Transcript from '@/components/Transcript';
import ConsensusTheater from '@/components/ConsensusTheater';
import LampStage from '@/components/LampStage';
import Standings from '@/components/Standings';
import StageGauntlet from '@/components/StageGauntlet';
import Docket from '@/components/Docket';
import VerdictLegend from '@/components/VerdictLegend';
import TypeLine from '@/components/TypeLine';
import { useWallet } from '@/hooks/useWallet';
import { useGauntlets } from '@/hooks/useGauntlets';
import {
  CONTRACT_ADDRESS,
  DEPLOY_TX,
  EXPLORER,
  FAUCET,
  fetchGauntlet,
  makeWalletClient,
  sendDefense,
  sendOpenGauntlet,
  type GauntletDetail,
  type GauntletSummary,
  type Stats,
} from '@/lib/contract';
import { pollUntilDecided, type LeaderDraft } from '@/lib/tx';
import { friendlyError, shortAddr, statusLabel, explorerTx } from '@/lib/format';

type Phase = 'idle' | 'wallet' | 'submitted' | 'consensus' | 'confirmed' | 'error';
type Filter = 'all' | 'open' | 'settled';

const THESIS_MAX = 600;
const STANCE_MAX = 200;
const DEFENSE_MAX = 800;

export default function Page() {
  const wallet = useWallet();
  const data = useGauntlets();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GauntletDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [showOpen, setShowOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // staged hero detail (the gauntlet shown center under the lamp on the docket)
  const [featuredDetail, setFeaturedDetail] = useState<GauntletDetail | null>(null);

  // open-gauntlet form
  const [thesis, setThesis] = useState('');
  const [stance, setStance] = useState('');
  const [rounds, setRounds] = useState(3);

  // defense form
  const [defense, setDefense] = useState('');

  // transaction state machine
  const [phase, setPhase] = useState<Phase>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState('PENDING');
  const [draft, setDraft] = useState<LeaderDraft | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [activeFlow, setActiveFlow] = useState<'open' | 'defense' | null>(null);

  const busy = phase === 'wallet' || phase === 'submitted' || phase === 'consensus';

  const flash = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 4200);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const d = await fetchGauntlet(id);
      setDetail(d);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const filtered = useMemo(() => {
    return data.gauntlets
      .filter((g) => {
        if (filter === 'open') return g.status === 'OPEN';
        if (filter === 'settled') return g.status !== 'OPEN';
        return true;
      })
      .sort((a, b) => Number(b.id.slice(1)) - Number(a.id.slice(1)));
  }, [data.gauntlets, filter]);

  // the gauntlet staged center: prefer the most recent open one, else the most
  // recent of any status, so the hero is always a live-feeling exchange.
  const featured: GauntletSummary | null = useMemo(() => {
    if (data.gauntlets.length === 0) return null;
    const sorted = [...data.gauntlets].sort(
      (a, b) => Number(b.id.slice(1)) - Number(a.id.slice(1)),
    );
    const open = sorted.find((g) => g.status === 'OPEN');
    return open ?? sorted[0];
  }, [data.gauntlets]);

  // load the full detail of the featured gauntlet for the staged exchange
  useEffect(() => {
    let alive = true;
    if (!featured) {
      setFeaturedDetail(null);
      return;
    }
    void (async () => {
      try {
        const d = await fetchGauntlet(featured.id);
        if (alive) setFeaturedDetail(d);
      } catch {
        if (alive) setFeaturedDetail(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [featured]);

  const resetTx = useCallback(() => {
    setPhase('idle');
    setTxHash(null);
    setLiveStatus('PENDING');
    setDraft(null);
    setTxError(null);
    setActiveFlow(null);
    data.setTxInFlight(false);
  }, [data]);

  const runWrite = useCallback(
    async (
      flow: 'open' | 'defense',
      submit: (client: ReturnType<typeof makeWalletClient>) => Promise<`0x${string}`>,
      onDone: (gid?: string) => Promise<void> | void,
    ) => {
      if (!wallet.address) {
        flash('Connect your wallet first.');
        return;
      }
      setActiveFlow(flow);
      setPhase('wallet');
      setTxError(null);
      setDraft(null);
      data.setTxInFlight(true);
      try {
        const client = makeWalletClient(wallet.address);
        const hash = await submit(client);
        setTxHash(hash);
        setPhase('submitted');
        setPhase('consensus');
        const { status, draft: d } = await pollUntilDecided(client, hash, (s, dd) => {
          setLiveStatus(s);
          if (dd) setDraft(dd);
        });
        if (status === 'ACCEPTED' || status === 'FINALIZED') {
          setPhase('confirmed');
          await onDone();
        } else if (status === 'UNDETERMINED') {
          setTxError('Validators could not agree on this ruling. Please try again.');
          setPhase('error');
        } else if (status === 'CANCELED') {
          setTxError('The transaction was canceled by the network.');
          setPhase('error');
        } else {
          setTxError('The network is still working. Your transaction may still settle, check the explorer.');
          setPhase('error');
        }
      } catch (e) {
        setTxError(friendlyError(e));
        setPhase('error');
      } finally {
        data.setTxInFlight(false);
      }
    },
    [wallet.address, flash, data],
  );

  const handleOpen = useCallback(async () => {
    const t = thesis.trim();
    const s = stance.trim();
    if (t.length < 20) {
      flash('Your thesis needs at least 20 characters.');
      return;
    }
    if (s.length < 5) {
      flash('State the stance you will defend.');
      return;
    }
    await runWrite(
      'open',
      (client) => sendOpenGauntlet(client, t, s, rounds),
      async () => {
        await data.reload();
        // find the new gauntlet (highest id) and select it
        try {
          const all = await (async () => {
            const { fetchGauntlets } = await import('@/lib/contract');
            return fetchGauntlets(0);
          })();
          const mine = all
            .filter((g) => g.challenger.toLowerCase() === wallet.address?.toLowerCase())
            .sort((a, b) => Number(b.id.slice(1)) - Number(a.id.slice(1)));
          if (mine[0]) setSelectedId(mine[0].id);
        } catch {
          /* ignore */
        }
        flash('Gauntlet opened. The adversary has issued its opening rebuttal.');
        setThesis('');
        setStance('');
      },
    );
  }, [thesis, stance, rounds, runWrite, data, wallet.address, flash]);

  const handleDefense = useCallback(async () => {
    if (!selectedId) return;
    const d = defense.trim();
    if (d.length < 1) {
      flash('Write your defense.');
      return;
    }
    await runWrite(
      'defense',
      (client) => sendDefense(client, selectedId, d),
      async () => {
        await loadDetail(selectedId);
        await data.reload();
        flash('Ruling sealed under consensus.');
        setDefense('');
      },
    );
  }, [selectedId, defense, runWrite, loadDetail, data, flash]);

  const isChallenger =
    detail && wallet.address && detail.challenger.toLowerCase() === wallet.address.toLowerCase();

  return (
    <>
      <div className="lamp-stage" aria-hidden>
        <span className="lamp-cord" />
        <span className="lamp-glow" />
        <LampStage />
        <span className="beam" />
        <span className="haze" />
      </div>
      <div className="table-grain" aria-hidden />
      <div className="vignette" aria-hidden />
      <div className="grain" aria-hidden />
      <div className="shell">
        <Header wallet={wallet} onConnect={wallet.connect} onDisconnect={wallet.disconnect} />

        <main className="wrap" style={{ flex: 1, width: '100%' }}>
          {!selectedId ? (
            <ListView
              gauntlets={filtered}
              stats={data.stats}
              featured={featured}
              featuredDetail={featuredDetail}
              loading={data.loading}
              error={data.error}
              stale={data.stale}
              filter={filter}
              onFilter={setFilter}
              onSelect={setSelectedId}
              onNew={() => setShowOpen(true)}
              onRetry={data.reload}
              hasWallet={!!wallet.address}
            />
          ) : (
            <DetailView
              detail={detail}
              loading={detailLoading}
              onBack={() => {
                setSelectedId(null);
                setDetail(null);
              }}
              isChallenger={!!isChallenger}
              hasWallet={!!wallet.address}
              defense={defense}
              setDefense={setDefense}
              onSubmitDefense={handleDefense}
              busy={busy}
            />
          )}
        </main>

        <footer className="footer wrap" style={{ width: '100%' }}>
          <Scale size={13} />
          <span>Steelman runs entirely on GenLayer Bradbury. No deposits, no custody, network fees only.</span>
          <span style={{ marginLeft: 'auto' }} className="hide-sm">
            <a href={explorerTx(EXPLORER, DEPLOY_TX)} target="_blank" rel="noreferrer">
              deploy tx
            </a>
            {'  .  '}
            <a href={FAUCET} target="_blank" rel="noreferrer">
              test GEN faucet
            </a>
          </span>
        </footer>
      </div>

      {/* open gauntlet modal */}
      <AnimatePresence>
        {showOpen && (
          <Scrim onClose={() => !busy && setShowOpen(false)}>
            <ModalHead title="Open a gauntlet" onClose={() => !busy && setShowOpen(false)} />
            <div className="modal-body">
              {phase === 'idle' || phase === 'error' ? (
                <>
                  <p style={{ color: 'var(--bone-dim)', marginTop: 0, fontSize: '0.96rem' }}>
                    Stake a thesis and the stance you will hold. The adversary opens with its strongest
                    rebuttal under consensus; you then defend it round by round.
                  </p>
                  <div style={{ margin: '18px 0' }}>
                    <label className="fld">Thesis</label>
                    <textarea
                      rows={3}
                      maxLength={THESIS_MAX}
                      placeholder="State the claim you are prepared to defend."
                      value={thesis}
                      onChange={(e) => setThesis(e.target.value)}
                    />
                    <div className="charcount">
                      {thesis.length}/{THESIS_MAX}
                    </div>
                  </div>
                  <div style={{ margin: '18px 0' }}>
                    <label className="fld">Stance</label>
                    <input
                      type="text"
                      maxLength={STANCE_MAX}
                      placeholder="What you are defending, in one line."
                      value={stance}
                      onChange={(e) => setStance(e.target.value)}
                    />
                    <div className="charcount">
                      {stance.length}/{STANCE_MAX}
                    </div>
                  </div>
                  <div style={{ margin: '18px 0' }}>
                    <label className="fld">Rounds to survive for vindication</label>
                    <div className="seg">
                      {[2, 3, 4, 5].map((n) => (
                        <button key={n} className={rounds === n ? 'on' : ''} onClick={() => setRounds(n)}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  {phase === 'error' && txError && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        color: 'var(--crimson)',
                        fontSize: '0.9rem',
                        margin: '4px 0 14px',
                      }}
                    >
                      <AlertTriangle size={16} /> {txError}
                    </div>
                  )}
                  {!wallet.address ? (
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={wallet.connect}>
                      Connect wallet to begin
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={handleOpen}
                      disabled={busy}
                    >
                      <Gavel size={16} /> Open the gauntlet
                    </button>
                  )}
                </>
              ) : phase === 'confirmed' ? (
                <ConfirmedBlock
                  onClose={() => {
                    setShowOpen(false);
                    resetTx();
                  }}
                  label="Gauntlet opened. The adversary has issued its opening rebuttal."
                />
              ) : (
                <ConsensusTheater
                  liveStatus={liveStatus}
                  draft={activeFlow === 'open' ? draft : null}
                  hash={txHash}
                  explorerBase={EXPLORER}
                />
              )}
            </div>
          </Scrim>
        )}
      </AnimatePresence>

      {/* defense consensus overlay (in detail view) */}
      <AnimatePresence>
        {selectedId && busy && activeFlow === 'defense' && (
          <Scrim onClose={() => {}}>
            <ModalHead title="The interrogation" onClose={() => {}} hideClose />
            <div className="modal-body">
              <ConsensusTheater liveStatus={liveStatus} draft={draft} hash={txHash} explorerBase={EXPLORER} />
            </div>
          </Scrim>
        )}
        {selectedId && phase === 'error' && activeFlow === 'defense' && txError && (
          <Scrim onClose={resetTx}>
            <ModalHead title="The round stalled" onClose={resetTx} />
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 10, color: 'var(--crimson)', marginBottom: 16 }}>
                <AlertTriangle size={18} /> {txError}
              </div>
              {txHash && (
                <a
                  className="mono"
                  href={explorerTx(EXPLORER, txHash)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.7rem', color: 'var(--bone-dim)', borderBottom: '1px solid var(--crimson)' }}
                >
                  view transaction
                </a>
              )}
              <button className="btn" style={{ width: '100%', marginTop: 18 }} onClick={resetTx}>
                Back to the table
              </button>
            </div>
          </Scrim>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
          >
            <span className="toast-mark" aria-hidden />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------

function ListView({
  gauntlets,
  stats,
  featured,
  featuredDetail,
  loading,
  error,
  stale,
  filter,
  onFilter,
  onSelect,
  onNew,
  onRetry,
  hasWallet,
}: {
  gauntlets: GauntletSummary[];
  stats: Stats | null;
  featured: GauntletSummary | null;
  featuredDetail: GauntletDetail | null;
  loading: boolean;
  error: string | null;
  stale: boolean;
  filter: Filter;
  onFilter: (f: Filter) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRetry: () => void;
  hasWallet: boolean;
}) {
  return (
    <>
      {/* case-file masthead */}
      <motion.section
        className="masthead"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="masthead-scan" aria-hidden />
        <div className="masthead-inner">
          <div className="masthead-tag">
            <span className="stamp-chip">Case open</span>
            <span>An on-chain AI debate gauntlet</span>
            <span style={{ opacity: 0.4 }}>.</span>
            <span>GenLayer Bradbury</span>
          </div>
          <h1>
            Take the chair. <span className="accent">Defend your thesis</span> under the lamp.
          </h1>
          <p>
            Stake a claim and the adversary, an injection-resistant AI interrogator, opens fire with its
            sharpest rebuttal. Answer round by round. Every ruling, HOLDS, CONCEDES, or COLLAPSES, is
            settled on-chain by GenLayer validators, not by any one server.
          </p>
          <div className="masthead-actions">
            <button className="btn btn-primary btn-lg" onClick={onNew}>
              <Plus size={16} /> Open a gauntlet
            </button>
            <button className="btn" onClick={onRetry}>
              <RefreshCw size={14} /> Refresh the docket
            </button>
          </div>
          <div className="masthead-rule" />
        </div>
      </motion.section>

      <Standings stats={stats} loading={loading} />

      {stale && (
        <div className="mono" style={{ fontSize: '0.66rem', color: 'var(--concede)', margin: '14px 0 0' }}>
          Data may be a couple of minutes old. The network reads slowly.
        </div>
      )}

      <div className="room-grid">
        <div>
          <div className="section-head">
            <span className="kicker">Under the lamp</span>
            {featured && (
              <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--bone-faint)' }}>
                {featured.id} . {statusLabel(featured.status)}
              </span>
            )}
          </div>

          {loading && !featured ? (
            <div className="stage" style={{ display: 'grid', gap: 14 }}>
              <div className="skel" style={{ height: 26, width: '40%' }} />
              <div className="skel" style={{ height: 56, width: '85%' }} />
              <div className="skel" style={{ height: 90 }} />
              <div className="skel" style={{ height: 44, width: '50%' }} />
            </div>
          ) : error && !featured ? (
            <div className="stage">
              <div className="note-card" style={{ border: 'none', padding: '24px 8px' }}>
                <AlertTriangle size={28} color="var(--crimson)" />
                <h3>Could not reach the contract</h3>
                <p style={{ maxWidth: '46ch', margin: '0 auto 16px' }}>{friendlyError(error)}</p>
                <button className="btn" onClick={onRetry}>
                  <RefreshCw size={14} /> Retry
                </button>
              </div>
            </div>
          ) : featured ? (
            <StageGauntlet
              summary={featured}
              detail={featuredDetail}
              onEnter={() => onSelect(featured.id)}
              onOpenNew={onNew}
            />
          ) : (
            <ChairEmptyState onNew={onNew} hasWallet={hasWallet} />
          )}
        </div>

        <aside className="rail">
          <Docket
            gauntlets={gauntlets}
            loading={loading}
            error={error}
            filter={filter}
            featuredId={featured?.id ?? null}
            onFilter={onFilter}
            onSelect={onSelect}
            onRetry={onRetry}
          />
          <VerdictLegend />
        </aside>
      </div>
    </>
  );
}

/**
 * The crafted start state: an empty chair staged on the lit table, a
 * typewriter intro line, and a clear invitation to take the chair. Never a bare
 * headline floating in black.
 */
function ChairEmptyState({ onNew, hasWallet }: { onNew: () => void; hasWallet: boolean }) {
  return (
    <motion.section
      className="stage"
      initial={{ opacity: 0, y: 22, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.16 }}
    >
      <div className="chair">
        <div className="chair-mark" aria-hidden>
          <ChairMark />
        </div>
        <div className="kicker" style={{ color: 'var(--crimson)', justifyContent: 'center', display: 'flex' }}>
          The room is empty
        </div>
        <h2>The lamp is lit. The chair is waiting.</h2>
        <p className="mono" style={{ fontSize: '0.82rem', color: 'var(--bone-dim)', minHeight: '1.4em' }}>
          <TypeLine
            text={'No gauntlet on the table yet. Stake the first thesis and the adversary takes its seat.'}
            speed={22}
            startDelay={400}
          />
        </p>
        <div className="stage-cta" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary btn-lg" onClick={onNew}>
            <Gavel size={16} /> {hasWallet ? 'Open the first gauntlet' : 'Connect and begin'}
          </button>
        </div>
      </div>
    </motion.section>
  );
}

function DetailView({
  detail,
  loading,
  onBack,
  isChallenger,
  hasWallet,
  defense,
  setDefense,
  onSubmitDefense,
  busy,
}: {
  detail: GauntletDetail | null;
  loading: boolean;
  onBack: () => void;
  isChallenger: boolean;
  hasWallet: boolean;
  defense: string;
  setDefense: (v: string) => void;
  onSubmitDefense: () => void;
  busy: boolean;
}) {
  return (
    <section className="transcript" style={{ paddingTop: 26 }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 18 }}>
        <ArrowLeft size={15} /> Docket
      </button>

      {loading || !detail ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="skel" style={{ height: 40, width: '60%' }} />
          <div className="skel" style={{ height: 120 }} />
          <div className="skel" style={{ height: 120 }} />
        </div>
      ) : (
        <motion.div
          className="detail-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="kicker">{detail.id} . challenger {shortAddr(detail.challenger)}</div>
          <h1
            className="display"
            style={{ fontWeight: 800, fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', lineHeight: 1.12, margin: '12px 0 6px' }}
          >
            {detail.thesis}
          </h1>
          <p style={{ color: 'var(--bone-dim)', fontStyle: 'italic', margin: '0 0 8px' }}>
            Defending: {detail.stance}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--bone-faint)' }}>
              conviction {detail.conviction}/100
            </span>
            <div className="meter" style={{ flex: 1, maxWidth: 220 }}>
              <span style={{ width: `${detail.conviction}%` }} />
            </div>
          </div>

          <Transcript g={detail} />

          {detail.status === 'OPEN' && detail.awaiting_defense && (
            <div className="panel" style={{ padding: 18, marginTop: 24 }}>
              {isChallenger ? (
                <>
                  <label className="fld">Your defense for round {detail.round}</label>
                  <textarea
                    rows={5}
                    maxLength={DEFENSE_MAX}
                    placeholder="Answer the rebuttal on the merits. Evasion or attempts to manipulate the adversary force a collapse."
                    value={defense}
                    onChange={(e) => setDefense(e.target.value)}
                    disabled={busy}
                  />
                  <div className="charcount">
                    {defense.length}/{DEFENSE_MAX}
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: 12 }}
                    onClick={onSubmitDefense}
                    disabled={busy}
                  >
                    <Send size={15} /> Submit defense for ruling
                  </button>
                </>
              ) : (
                <p style={{ color: 'var(--bone-dim)', margin: 0, fontSize: '0.95rem' }}>
                  {hasWallet
                    ? 'Only the challenger who opened this gauntlet may submit a defense. You can watch the interrogation unfold.'
                    : 'Connect the challenger wallet to defend this thesis. Anyone can watch.'}
                </p>
              )}
            </div>
          )}
        </motion.div>
      )}
    </section>
  );
}

function ConfirmedBlock({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          margin: '0 auto 16px',
          display: 'grid',
          placeItems: 'center',
          border: '1px solid var(--hold)',
          color: 'var(--hold)',
        }}
      >
        <Gavel size={24} />
      </div>
      <p style={{ color: 'var(--bone)', fontSize: '1.02rem', maxWidth: '40ch', margin: '0 auto 18px' }}>
        {label}
      </p>
      <button className="btn btn-primary" onClick={onClose}>
        Enter the room
      </button>
    </div>
  );
}

function Scrim({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      className="scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        className="modal"
        initial={{ opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function ModalHead({
  title,
  onClose,
  hideClose,
}: {
  title: string;
  onClose: () => void;
  hideClose?: boolean;
}) {
  return (
    <div className="modal-head">
      <h3>{title}</h3>
      {!hideClose && (
        <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
          Close
        </button>
      )}
    </div>
  );
}

function ChairMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden>
      <path
        d="M10 5v11M24 5v11M9 16h16M11 16l-1 13M23 16l1 13M10 22h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
