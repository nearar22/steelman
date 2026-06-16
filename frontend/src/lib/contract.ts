import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import type { GenLayerClient } from 'genlayer-js/types';

// Real deployed contract on GenLayer Bradbury testnet. Verified end to end:
// get_stats returned live data and a real defense ruling settled on-chain
// (ruling HOLDS, conviction 95, round advanced) before this constant was written.
export const CONTRACT_ADDRESS = '0x2344c3ee47C2f546c5e6Ad205aF20F6E2a06397b' as const;
export const DEPLOY_TX =
  '0xe343fc375caf8f901f1fbe4fc1dea30bde130b1495a3671e43b8913c8e0f5abd' as const;
export const EXPLORER = 'https://explorer-bradbury.genlayer.com';
export const FAUCET = 'https://testnet-faucet.genlayer.foundation/';
export const CHAIN_ID = 4221;

export const readClient = createClient({ chain: testnetBradbury });

export type WalletClient = GenLayerClient<typeof testnetBradbury>;

export function makeWalletClient(account: `0x${string}`): GenLayerClient<typeof testnetBradbury> {
  return createClient({ chain: testnetBradbury, account });
}

export async function withRpcRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!/rate limit|429|timeout|network|fetch|failed/i.test(String(e))) throw e;
      await new Promise((r) => setTimeout(r, 2500 * 2 ** i));
    }
  }
  throw last;
}

// ----- domain types ---------------------------------------------------------

export interface GauntletSummary {
  id: string;
  challenger: string;
  thesis: string;
  stance: string;
  status: string;
  round: number;
  target_rounds: number;
  conviction: number;
  rounds_done: number;
}

export interface RoundEntry {
  round: number;
  rebuttal: string;
  defense: string;
  ruling: string;
  conviction: number;
  rationale: string;
}

export interface GauntletDetail extends GauntletSummary {
  awaiting_defense: boolean;
  pending_rebuttal: string;
  outcome_rationale: string;
  rounds: RoundEntry[];
}

export interface Stats {
  gauntlets: number;
  open: number;
  vindicated: number;
  collapsed: number;
  rulings: number;
}

// genlayer-js returns plain objects / maps depending on version; coerce safely.
function asObj(v: unknown): Record<string, unknown> {
  if (v instanceof Map) return Object.fromEntries(v) as Record<string, unknown>;
  if (v && typeof v === 'object') return v as Record<string, unknown>;
  return {};
}
function num(v: unknown): number {
  const n = typeof v === 'bigint' ? Number(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function str(v: unknown): string {
  return v === undefined || v === null ? '' : String(v);
}

function toSummary(raw: unknown): GauntletSummary {
  const o = asObj(raw);
  return {
    id: str(o.id),
    challenger: str(o.challenger),
    thesis: str(o.thesis),
    stance: str(o.stance),
    status: str(o.status) || 'OPEN',
    round: num(o.round),
    target_rounds: num(o.target_rounds),
    conviction: num(o.conviction),
    rounds_done: num(o.rounds_done),
  };
}

function toRound(raw: unknown): RoundEntry {
  const o = asObj(raw);
  return {
    round: num(o.round),
    rebuttal: str(o.rebuttal),
    defense: str(o.defense),
    ruling: str(o.ruling),
    conviction: num(o.conviction),
    rationale: str(o.rationale),
  };
}

function toDetail(raw: unknown): GauntletDetail {
  const o = asObj(raw);
  const roundsRaw = o.rounds;
  return {
    ...toSummary(raw),
    awaiting_defense: Boolean(o.awaiting_defense),
    pending_rebuttal: str(o.pending_rebuttal),
    outcome_rationale: str(o.outcome_rationale),
    rounds: Array.isArray(roundsRaw) ? roundsRaw.map(toRound) : [],
  };
}

// ----- reads ----------------------------------------------------------------

export async function fetchGauntlets(start = 0): Promise<GauntletSummary[]> {
  const res = await withRpcRetry(() =>
    readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_gauntlets',
      args: [start],
    }),
  );
  return Array.isArray(res) ? res.map(toSummary) : [];
}

export async function fetchGauntlet(id: string): Promise<GauntletDetail> {
  const res = await withRpcRetry(() =>
    readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_gauntlet',
      args: [id],
    }),
  );
  return toDetail(res);
}

export async function fetchStats(): Promise<Stats> {
  const res = await withRpcRetry(() =>
    readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_stats',
      args: [],
    }),
  );
  const o = asObj(res);
  return {
    gauntlets: num(o.gauntlets),
    open: num(o.open),
    vindicated: num(o.vindicated),
    collapsed: num(o.collapsed),
    rulings: num(o.rulings),
  };
}

// ----- writes ---------------------------------------------------------------

export async function sendOpenGauntlet(
  client: GenLayerClient<typeof testnetBradbury>,
  thesis: string,
  stance: string,
  targetRounds: number,
): Promise<`0x${string}`> {
  return client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'open_gauntlet',
    args: [thesis, stance, targetRounds],
    value: 0n,
  });
}

export async function sendDefense(
  client: GenLayerClient<typeof testnetBradbury>,
  gauntletId: string,
  defense: string,
): Promise<`0x${string}`> {
  return client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'submit_defense',
    args: [gauntletId, defense],
    value: 0n,
  });
}
