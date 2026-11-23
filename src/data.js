const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const source = require('../records/sisarma.json');

function normalize(input) {
  return input.normalize('NFKC').toLowerCase().replace(/[०-९]/g, n => String(n.charCodeAt(0) - 2406))
    .replace(/\s*\/\s*/g, '/').replace(/[^\p{L}\p{M}\p{N}/]+/gu, ' ').trim();
}

const names = [
  ...source.holding.landholder, ...source.holding.cultivator, 'राजस्थान सरकार',
  'राज सरकार', 'van vibhag range udaipur', 'van vibhaag renj udaipur', 'rajasthan sarkar',
  'rajasthan state government', 'forest department udaipur range', 'वन विभाग उदयपुर'
].map(normalize);

function nearWord(a, b) {
  if (a === b) return true;
  if (a.length < 4 || Math.abs(a.length - b.length) > 1) return false;
  let previous = Array.from({length:b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next.push(Math.min(next[j-1]+1, previous[j]+1, previous[j-1]+Number(a[i-1] !== b[j-1])));
    previous = next;
  }
  return previous[b.length] <= 1;
}

function holdingMatch(query) {
  const words = query.split(' ');
  if (query.length < 2) return false;
  return names.some(name => words.every(w => name.split(' ').some(n => nearWord(w, n))));
}

function openStore(filename) {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), {recursive:true});
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS plots (
      village TEXT NOT NULL, khasra TEXT NOT NULL, area TEXT NOT NULL, kind TEXT NOT NULL,
      PRIMARY KEY(village,khasra));
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, digest TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS saves (user_id INTEGER NOT NULL REFERENCES users(id), village TEXT NOT NULL, khasra TEXT NOT NULL,
      PRIMARY KEY(user_id,village,khasra), FOREIGN KEY(village,khasra) REFERENCES plots(village,khasra));
    CREATE TABLE IF NOT EXISTS searches (id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id), mode TEXT NOT NULL, term TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS access_log (id INTEGER PRIMARY KEY, user_id INTEGER, village TEXT NOT NULL, khasra TEXT NOT NULL, at INTEGER NOT NULL);`);
  db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
  db.prepare('DELETE FROM access_log WHERE at<?').run(Date.now()-30*86400000);
  const lines = fs.readFileSync(path.join(__dirname,'..','records','khata-905.csv'),'utf8').trim().split(/\r?\n/).slice(1);
  const records = lines.map(line => line.split(','));
  for(const [key,area,kind,...extra] of records){
    if(!/^\d+(?:\/\d+)*$/.test(key)||!/^\d+\.\d{4}$/.test(area)||Number(area)<=0||
       !['मगरि','रास्ता','पहाड़'].includes(kind)||extra.length) throw Error('Invalid archived parcel row: '+key);
  }
  const total = records.reduce((n, r) => n + Math.round(Number(r[1]) * 10000), 0);
  if (new Set(records.map(r => r[0])).size !== 98 || records.length !== 98 || total !== 9103300) throw Error('Source control totals differ');
  db.exec('BEGIN IMMEDIATE');
  try {
    const insert = db.prepare('INSERT INTO plots VALUES (?,?,?,?) ON CONFLICT(village,khasra) DO UPDATE SET area=excluded.area,kind=excluded.kind');
    for (const [id, area, kind] of records) insert.run(source.scope,id,area,kind);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  const plot = k => db.prepare('SELECT * FROM plots WHERE village=? AND khasra=?').get(source.scope,k);
  const list = () => db.prepare('SELECT * FROM plots WHERE village=? ORDER BY CAST(khasra AS INTEGER),khasra').all(source.scope);
  function search(mode, value) {
    const q = normalize(value);
    if (!q) return [];
    if (mode === 'khasra') { const p = plot(q); return p ? [p] : []; }
    if (mode === 'khata' && [source.holding.khata, source.holding.oldKhata].includes(q)) return list();
    if (mode === 'name' && holdingMatch(q)) return list();
    return [];
  }
  function audit(user, khasra) {
    const now = Date.now();
    db.prepare('DELETE FROM access_log WHERE at < ?').run(now-30*86400000);
    db.prepare('INSERT INTO access_log(user_id,village,khasra,at) VALUES(?,?,?,?)').run(user?.id ?? null,source.scope,khasra,now);
  }
  return { db, plot, list, search, audit };
}
module.exports = { openStore, source, normalize };
