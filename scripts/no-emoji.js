const fs = require('fs'), path = require('path');
const RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
const SKIP = new Set(['node_modules', '.next', 'out', '.git']);
let bad = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const fp = path.join(dir, name);
    if (fs.statSync(fp).isDirectory()) walk(fp);
    else if (/\.(tsx?|jsx?|css|html|md|json)$/.test(name) && RE.test(fs.readFileSync(fp, 'utf8')))
      bad.push(fp);
  }
})(process.cwd());
if (bad.length) { console.error('EMOJIS FOUND:\n' + bad.join('\n')); process.exit(1); }
console.log('No emojis - clean.');
