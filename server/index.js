// เซิร์ฟเวอร์เก็บภาพ/คิว/ฉากหลัง และให้บริการหน้าเว็บ (หลัง `npm run build`)
// ไม่มี dependency เพิ่ม ใช้ Node 18+ เท่านั้น
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 8787);
const MAX_UPLOAD = 40 * 1024 * 1024;
const DB_FILE = path.join(DATA, 'db.json');

fs.mkdirSync(path.join(DATA, 'photos'), { recursive: true });
fs.mkdirSync(path.join(DATA, 'backgrounds'), { recursive: true });

const emptyDb = () => ({ queue: 428, sessions: {}, backgrounds: [] });
let db = emptyDb();
try { db = { ...emptyDb(), ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }; } catch { /* เริ่มใหม่ */ }
const save = () => {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
};
const pad = n => String(n).padStart(4, '0');
const newId = () => crypto.randomBytes(6).toString('hex');
const isCode = s => /^\d{4}$/.test(s);
const isId = s => /^[a-f0-9]{12}$/.test(s);

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
};
const readBody = req => new Promise((resolve, reject) => {
  const chunks = []; let size = 0;
  req.on('data', c => {
    size += c.length;
    if (size > MAX_UPLOAD) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});
const sendFile = (res, file, type, extra = {}) => {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return json(res, 404, { error: 'not found' });
    res.writeHead(200, { 'content-type': type, 'content-length': st.size, ...extra });
    fs.createReadStream(file).pipe(res);
  });
};
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.ico': 'image/x-icon' };

const todayStr = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD ตามเวลาเครื่อง

async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // ตัด "api"
  const [a, b] = parts;
  const m = req.method;

  if (a === 'state' && m === 'GET') return json(res, 200, { code: pad(db.queue) });
  if (a === 'next' && m === 'POST') { db.queue += 1; save(); return json(res, 200, { code: pad(db.queue) }); }

  if (a === 'stats' && m === 'GET') {
    const byBg = {}; let total = 0, today = 0; const t = todayStr();
    for (const shots of Object.values(db.sessions)) for (const s of shots) {
      total++; if (s.day === t) { today++; byBg[s.bgId] = (byBg[s.bgId] || 0) + 1; }
    }
    return json(res, 200, { total, today, byBg });
  }

  if (a === 'sessions' && m === 'GET' && isCode(b || '')) return json(res, 200, { code: b, shots: db.sessions[b] || [] });

  if (a === 'photos' && m === 'POST') {
    const code = url.searchParams.get('code') || '';
    const bgId = (url.searchParams.get('bgId') || '').slice(0, 64);
    const mode = url.searchParams.get('mode') || 'full';
    if (!isCode(code) || !['full', 'half', 'group'].includes(mode)) return json(res, 400, { error: 'bad params' });
    const body = await readBody(req);
    if (body.length < 4 || body[0] !== 0xff || body[1] !== 0xd8) return json(res, 400, { error: 'JPEG only' });
    const id = newId();
    fs.writeFileSync(path.join(DATA, 'photos', id + '.jpg'), body);
    const shot = { id, bgId, mode, at: Date.now(), day: todayStr() };
    (db.sessions[code] ||= []).push(shot); save();
    return json(res, 201, shot);
  }
  if (a === 'photos' && isId((b || '').replace(/\.jpg$/, ''))) {
    const id = b.replace(/\.jpg$/, '');
    if (m === 'GET') {
      const dl = url.searchParams.get('dl') === '1';
      return sendFile(res, path.join(DATA, 'photos', id + '.jpg'), 'image/jpeg',
        dl ? { 'content-disposition': `attachment; filename="PSRU-${id}.jpg"` } : { 'cache-control': 'public, max-age=86400' });
    }
    if (m === 'DELETE') {
      for (const code of Object.keys(db.sessions)) db.sessions[code] = db.sessions[code].filter(s => s.id !== id);
      fs.rmSync(path.join(DATA, 'photos', id + '.jpg'), { force: true }); save();
      return json(res, 200, { ok: true });
    }
  }

  if (a === 'backgrounds' && !b && m === 'GET') return json(res, 200, { backgrounds: db.backgrounds });
  if (a === 'backgrounds' && !b && m === 'POST') {
    const name = decodeURIComponent(url.searchParams.get('name') || '').slice(0, 80).trim();
    if (!name) return json(res, 400, { error: 'name required' });
    const body = await readBody(req);
    if (body.length < 4 || body[0] !== 0xff || body[1] !== 0xd8) return json(res, 400, { error: 'JPEG only' });
    const id = newId();
    fs.writeFileSync(path.join(DATA, 'backgrounds', id + '.jpg'), body);
    const bg = { id, name }; db.backgrounds.push(bg); save();
    return json(res, 201, bg);
  }
  if (a === 'backgrounds' && isId((b || '').replace(/\.jpg$/, ''))) {
    const id = b.replace(/\.jpg$/, '');
    if (m === 'GET') return sendFile(res, path.join(DATA, 'backgrounds', id + '.jpg'), 'image/jpeg', { 'cache-control': 'public, max-age=86400' });
    if (m === 'DELETE') {
      db.backgrounds = db.backgrounds.filter(x => x.id !== id);
      fs.rmSync(path.join(DATA, 'backgrounds', id + '.jpg'), { force: true }); save();
      return json(res, 200, { ok: true });
    }
  }
  return json(res, 404, { error: 'not found' });
}

function serveStatic(req, res, url) {
  if (!fs.existsSync(DIST)) {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('ยังไม่ได้ build หน้าเว็บ: รัน `npm run build` หรือใช้ `npm run dev` (เปิดที่พอร์ต 5173)');
  }
  let rel = decodeURIComponent(url.pathname);
  let file = path.join(DIST, rel);
  if (!file.startsWith(DIST + path.sep) && file !== DIST) return json(res, 403, { error: 'forbidden' });
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  sendFile(res, file, MIME[path.extname(file)] || 'application/octet-stream');
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    return serveStatic(req, res, url);
  } catch (e) {
    if (!res.headersSent) json(res, e.status || 500, { error: e.message || 'error' });
    else res.destroy();
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Photo Booth server พร้อมที่พอร์ต ${PORT}  (เก็บข้อมูลที่ ${DATA})`);
  for (const list of Object.values(os.networkInterfaces()))
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) console.log(`  ในวง LAN:  http://${i.address}:${PORT}  (โหมด dev ใช้พอร์ต 5173)`);
});
