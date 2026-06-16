'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchGauntlets, fetchStats, type GauntletSummary, type Stats } from '@/lib/contract';

const POLL_MS = 95000;

export function useGauntlets() {
  const [gauntlets, setGauntlets] = useState<GauntletSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastLoaded, setLastLoaded] = useState<number>(0);

  const alive = useRef(true);
  const txInFlight = useRef(false);

  const loadAll = useCallback(async () => {
    try {
      const all: GauntletSummary[] = [];
      let start = 0;
      // page through (20 per page) until short page
      for (let p = 0; p < 25; p++) {
        const page = await fetchGauntlets(start);
        all.push(...page);
        if (page.length < 20) break;
        start += 20;
      }
      const s = await fetchStats();
      if (!alive.current) return;
      setGauntlets(all);
      setStats(s);
      setError(null);
      setLastLoaded(Date.now());
    } catch (e) {
      if (!alive.current) return;
      setError(String(e));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void loadAll();
    const id = setInterval(() => {
      if (!txInFlight.current) void loadAll();
    }, POLL_MS);
    return () => {
      alive.current = false;
      clearInterval(id);
    };
  }, [loadAll]);

  const setTxInFlight = useCallback((v: boolean) => {
    txInFlight.current = v;
  }, []);

  const stale = lastLoaded > 0 && Date.now() - lastLoaded > 130000;

  const derived = useMemo(() => {
    const open = gauntlets.filter((g) => g.status === 'OPEN').length;
    return { open };
  }, [gauntlets]);

  return {
    gauntlets,
    stats,
    loading,
    error,
    stale,
    derived,
    reload: loadAll,
    setTxInFlight,
  };
}
