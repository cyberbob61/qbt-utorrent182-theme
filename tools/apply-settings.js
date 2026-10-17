// Apply the qBittorrent settings this theme relies on but cannot carry itself.
// Run it while qBittorrent is CLOSED (qBittorrent rewrites the ini on exit):
//   node tools/apply-settings.js [path\to\qBittorrent.ini]
// Default ini: %APPDATA%\qBittorrent\qBittorrent.ini. A backup is written next to it first.
const fs = require('fs');
const path = require('path');

const ini = process.argv[2] || path.join(process.env.APPDATA || '', 'qBittorrent', 'qBittorrent.ini');
const themeConfig = path.resolve(__dirname, '..', 'config.json').replace(/\\/g, '/'); // QSettings keeps '/' as is

const KEYS = [
  ['Preferences', 'General\\UseCustomUITheme', 'true'],
  ['Preferences', 'General\\CustomUIThemePath', themeConfig],
  ['Preferences', 'General\\AlternatingRowColors', 'false'],
  ['Appearance', 'Style', 'windowsvista'],
  ['Appearance', 'ColorScheme', 'Light'],
  ['TransferListFilters', 'TagFilterState', 'false'],
  ['TransferListFilters', 'trackerFilterState', 'false'],
  ['TransferListFilters', 'TrackerStatusFilterState', 'false'],
  ['TransferListFilters', 'HideZeroStatusFilters', 'true'],
];

// uTorrent 1.8.2 column order -> qBittorrent TransferListModel column ids, with widths (logical px):
// Name, #, Size, Done, Status, Seeds, Peers, Down Speed, Up Speed, ETA, Uploaded, Ratio, Avail., Label, Added On, Completed On
const COLUMNS = [[1, 250], [0, 26], [2, 70], [4, 80], [5, 100], [6, 60], [7, 60], [8, 75], [9, 75], [10, 70], [21, 70], [11, 50], [31, 50], [13, 80], [15, 130], [16, 130]];
const HEADER_KEY = 'Qt6\\TransferList\\HeaderState=@ByteArray(';

// ---------- ini keys ----------
function setKey(text, section, key, value) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  let s = lines.findIndex(l => l.trim() === `[${section}]`);
  if (s < 0) { lines.push('', `[${section}]`); s = lines.length - 1; }
  let e = s + 1;
  while (e < lines.length && !lines[e].startsWith('[')) e++;
  const i = lines.slice(s + 1, e).findIndex(l => l.startsWith(key + '='));
  if (i >= 0) lines[s + 1 + i] = `${key}=${value}`;
  else { let j = e; while (j > s + 1 && lines[j - 1].trim() === '') j--; lines.splice(j, 0, `${key}=${value}`); }
  return lines.join(eol);
}

// ---------- QHeaderView::saveState (Qt 6) ----------
function unescapeIni(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '\\') { out.push(s.charCodeAt(i) & 0xff); continue; }
    const n = s[++i];
    if (n === 'x') { let v = 0, j = i + 1; while (j < s.length && /[0-9a-fA-F]/.test(s[j])) v = v * 16 + parseInt(s[j++], 16); out.push(v & 0xff); i = j - 1; }
    else if (/[0-7]/.test(n)) { let v = 0, j = i; while (j < s.length && /[0-7]/.test(s[j])) v = v * 8 + +s[j++]; out.push(v & 0xff); i = j - 1; }
    else out.push({ a: 7, b: 8, f: 12, n: 10, r: 13, t: 9, v: 11 }[n] ?? n.charCodeAt(0));
  }
  return Buffer.from(out);
}
const escapeIni = b => [...b].map(x => '\\x' + x.toString(16)).join('');

function parseHeader(b) {
  let o = 0;
  const i = () => { const v = b.readInt32BE(o); o += 4; return v; };
  const u = () => { const v = b.readUInt32BE(o); o += 4; return v; };
  const bool = () => b[o++] !== 0;
  const h = { marker: i(), ver: i() };
  if (h.marker !== 0xff || h.ver !== 0) throw new Error('unknown header state version');
  Object.assign(h, { orient: i(), sortOrder: i(), sortSection: i(), sortShown: bool() });
  const list = () => Array.from({ length: u() }, i);
  h.visual = list(); h.logical = list();
  const nbits = u(), bytes = b.subarray(o, o += Math.ceil(nbits / 8));
  h.hidden = Array.from({ length: nbits }, (_, k) => (bytes[k >> 3] >> (k & 7)) & 1);
  h.hiddenSize = Array.from({ length: u() }, () => [i(), i()]);
  Object.assign(h, { length: i(), count: i(), flags: [bool(), bool(), bool(), bool(), bool()] });
  Object.assign(h, { stretchSections: i(), contentsSections: i(), defSize: i(), minSize: i(), align: i(), resizeMode: i() });
  h.items = Array.from({ length: u() }, () => ({ size: i(), one: i(), mode: i() }));
  h.tail = b.subarray(o);
  return h;
}
function writeHeader(h) {
  const parts = [];
  const i = v => { const x = Buffer.alloc(4); x.writeInt32BE(v); parts.push(x); };
  const bool = v => parts.push(Buffer.from([v ? 1 : 0]));
  [h.marker, h.ver, h.orient, h.sortOrder, h.sortSection].forEach(i); bool(h.sortShown);
  i(h.visual.length); h.visual.forEach(i); i(h.logical.length); h.logical.forEach(i);
  i(h.hidden.length);
  const bits = Buffer.alloc(Math.ceil(h.hidden.length / 8));
  h.hidden.forEach((v, k) => { if (v) bits[k >> 3] |= 1 << (k & 7); });
  parts.push(bits);
  i(h.hiddenSize.length); h.hiddenSize.forEach(([k, v]) => { i(k); i(v); });
  i(h.length); i(h.count); h.flags.forEach(bool);
  [h.stretchSections, h.contentsSections, h.defSize, h.minSize, h.align, h.resizeMode].forEach(i);
  i(h.items.length); h.items.forEach(x => { i(x.size); i(x.one); i(x.mode); });
  parts.push(h.tail);
  return Buffer.concat(parts);
}
// sectionItems and hidden bits are indexed by VISUAL position; hiddenSectionSize is keyed by LOGICAL column
function arrangeColumns(h) {
  const vis = l => (h.visual.length ? h.visual[l] : l);
  const want = new Map(COLUMNS);
  const order = [...COLUMNS.map(c => c[0]), ...[...Array(h.count).keys()].filter(l => !want.has(l))];
  const hs = new Map(h.hiddenSize), items = [], hidden = [];
  order.forEach((l, v) => {
    const old = h.items[vis(l)], wasHidden = h.hidden[vis(l)];
    items[v] = { ...old };
    if (want.has(l)) { hidden[v] = 0; items[v].size = want.get(l); hs.delete(l); }
    else { hidden[v] = 1; if (!wasHidden) hs.set(l, old.size || 100); items[v].size = 0; }
  });
  Object.assign(h, { items, hidden, hiddenSize: [...hs], logical: order, visual: [] });
  order.forEach((l, v) => { h.visual[l] = v; });
  h.length = items.reduce((a, x) => a + x.size, 0);
  h.sortSection = 0; h.sortOrder = 0; // sort by queue position like uTorrent
  return h;
}
function setColumns(text) {
  const s = text.indexOf(HEADER_KEY);
  if (s < 0) { console.log('no saved column layout yet (start and close qBittorrent once, then rerun) - columns skipped'); return text; }
  const m = /\)\r?\n|\)$/.exec(text.slice(s));
  if (!m) throw new Error('unterminated HeaderState value');
  const e = s + m.index;
  const bytes = unescapeIni(text.slice(s + HEADER_KEY.length, e));
  const h = parseHeader(bytes);
  if (!writeHeader(h).equals(bytes)) throw new Error('column layout format not understood (round-trip mismatch) - columns left untouched');
  if (h.count < 32) throw new Error(`expected qBittorrent 5.x columns, found ${h.count}`);
  const out = writeHeader(arrangeColumns(h));
  if (parseHeader(out).logical.slice(0, COLUMNS.length).join() !== COLUMNS.map(c => c[0]).join()) throw new Error('self-check failed');
  return text.slice(0, s + HEADER_KEY.length) + escapeIni(out) + text.slice(e);
}

// ---------- main ----------
if (!fs.existsSync(ini)) throw new Error(`not found: ${ini}`);
let text = fs.readFileSync(ini, 'latin1');
const backup = `${ini}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.writeFileSync(backup, text, 'latin1');
for (const [sec, key, val] of KEYS) text = setKey(text, sec, key, val);
text = setColumns(text);
fs.writeFileSync(ini, text, 'latin1');
console.log(`updated ${ini}\nbackup  ${backup}\ntheme   ${themeConfig}`);
