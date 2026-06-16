export const shortAddr = (a: string): string =>
  a && a.length > 12 ? `${a.slice(0, 6)}\u2026${a.slice(-4)}` : a;

export function rulingLabel(ruling: string): string {
  switch (ruling.toUpperCase()) {
    case 'HOLDS':
      return 'Holds';
    case 'CONCEDES':
      return 'Concedes';
    case 'COLLAPSES':
      return 'Collapses';
    default:
      return ruling;
  }
}

export function statusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'OPEN':
      return 'In session';
    case 'VINDICATED':
      return 'Vindicated';
    case 'COLLAPSED':
      return 'Collapsed';
    default:
      return status;
  }
}

export function friendlyError(raw: unknown): string {
  const msg = String(raw ?? '');
  if (/LackOfFundForMaxFee/i.test(msg))
    return 'Your wallet is below the fee reserve for AI transactions (mostly refunded). Top up at the GenLayer faucet.';
  if (/user rejected|rejected the request|denied|4001/i.test(msg))
    return 'You cancelled the signature.';
  if (/rate limit|429/i.test(msg))
    return 'The network is busy reading state. Give it a moment and retry.';
  if (/contract not found|execution reverted/i.test(msg))
    return 'No contract responded at the configured address on Bradbury. The deployment may need repair.';
  if (/timeout|congest/i.test(msg))
    return 'The network is congested. Your transaction is still being processed.';
  if (/network|fetch|connection/i.test(msg))
    return 'Network error. Check your connection and retry.';
  if (/EXPECTED/.test(msg)) {
    const m = msg.match(/\[EXPECTED\]\s*(.+?)(?:"|$)/);
    if (m) return m[1].trim();
  }
  return msg.length > 0 && msg.length < 160 ? msg : 'Something went wrong. Please retry.';
}

export const explorerTx = (base: string, hash: string): string => `${base}/tx/${hash}`;
export const explorerAddr = (base: string, addr: string): string => `${base}/address/${addr}`;
