const fs = require('fs'), path = require('path');
const SKIP = new Set(['node_modules', '.next', 'out', '.git', 'artifacts', '.gltest_cache', '__pycache__', '.pytest_cache']);
let bad = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp);
    else if (/\.(tsx?|jsx?|css|html|md|json|py|yaml|yml)$/.test(name)) {
      const txt = fs.readFileSync(fp, 'utf8');
      const idx = txt.indexOf('\u2014');
      if (idx >= 0) bad.push(fp + ' @ ' + idx);
    }
  }
})(process.cwd());
if (bad.length) { console.error('EM-DASH FOUND:\n' + bad.join('\n')); process.exit(1); }
console.log('No em-dash - clean.');
