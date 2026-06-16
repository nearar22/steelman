import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

const ADDR = '0x2344c3ee47C2f546c5e6Ad205aF20F6E2a06397b';
const c = createClient({ chain: testnetBradbury });
const stats = await c.readContract({ address: ADDR, functionName: 'get_stats', args: [] });
console.log('stats:', JSON.stringify(stats, (_, v) => (typeof v === 'bigint' ? Number(v) : v)));
const page = await c.readContract({ address: ADDR, functionName: 'get_gauntlets', args: [0] });
console.log('gauntlets count:', Array.isArray(page) ? page.length : page);
const first = Array.isArray(page) && page[0] ? page[0] : null;
if (first) console.log('first id:', first.id ?? (first.get && first.get('id')));
