#!/usr/bin/env node
// Verifies an Attest audit export without using the app.
// Usage: node verify-audit.mjs [--partial] batch-1.csv [batch-2.csv ...]
// Give it every batch of an export together, so each page's chain is complete.
// Exits 0 if every chain verifies from its first entry, 1 if any entry fails or is missing.
// --partial is for an export limited with a Since date: chains may then start later than entry 1.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// The export prefixes values that spreadsheets would run as formulas with an apostrophe.
const undo = (v) => (/^'+[=+\-@\t\r]/.test(v) ? v.slice(1) : v);

const args = process.argv.slice(2);
const partial = args.includes('--partial');
const files = args.filter((a) => a !== '--partial');
if (!files.length) { console.error('Usage: node verify-audit.mjs [--partial] batch-1.csv [batch-2.csv ...]'); process.exit(2); }
const rows = [];
let head = null;
for (const file of files) {
  const [h, ...r] = parseCsv(readFileSync(file, 'utf8')).filter((row) => row.length > 1);
  if (head && h.join() !== head.join()) { console.error(`${file} has different columns from ${files[0]}`); process.exit(2); }
  head = h;
  rows.push(...r);
}
const at = Object.fromEntries(head.map((h, i) => [h, i]));
for (const need of ['seq', 'prev_hash', 'hash', 'page_id']) {
  if (!(need in at)) { console.error(`Not an Attest export: missing column ${need}`); process.exit(2); }
}
const get = (r, k) => undo(r[at[k]] ?? '');
const chains = new Map();
let unchained = 0;
for (const r of rows) {
  if (!get(r, 'hash')) { unchained++; continue; }
  const id = get(r, 'page_id');
  if (!chains.has(id)) chains.set(id, []);
  chains.get(id).push(r);
}
let failed = 0, verified = 0;
for (const [id, list] of chains) {
  list.sort((a, b) => Number(get(a, 'seq')) - Number(get(b, 'seq')));
  let prev = null, problem = '';
  for (const r of list) {
    const seq = Number(get(r, 'seq'));
    const body = JSON.stringify([seq, get(r, 'prev_hash'), id, get(r, 'space'), get(r, 'timestamp_utc'), get(r, 'actor_id'), get(r, 'actor_name'), get(r, 'from_state'), get(r, 'to_state'), Number(get(r, 'version')), get(r, 'note')]);
    const want = createHash('sha256').update(body, 'utf8').digest('hex');
    if (want !== get(r, 'hash')) { problem = `entry ${seq} has been altered`; break; }
    if (!prev && !partial && (seq !== 1 || get(r, 'prev_hash'))) { problem = `entries before ${seq} are missing from these files`; break; }
    if (prev && seq === prev.seq && get(r, 'hash') === prev.hash) continue;
    if (prev && (seq !== prev.seq + 1 || get(r, 'prev_hash') !== prev.hash)) { problem = `entry ${seq} does not follow entry ${prev.seq}`; break; }
    prev = { seq, hash: get(r, 'hash') };
    verified++;
  }
  if (problem) { failed++; console.log(`FAIL  ${id}: ${problem}`); }
  else console.log(`OK    ${id}: ${prev.seq - Number(get(list[0], 'seq')) + 1} entries${partial ? ` from seq ${get(list[0], 'seq')}` : ''}, newest hash ${prev.hash}`);
}
console.log(`\n${verified} entries verified across ${chains.size} chains.${unchained ? ` ${unchained} entries predate chaining and were not checked.` : ''}`);
console.log("This can't see newest entries being removed. Keep the newest hash from each export and check it still appears in later ones.");
process.exit(failed ? 1 : 0);
