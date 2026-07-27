// AstroBotany Calibration Image Database — backend.
//
// A small Express server backed by Node's built-in SQLite (see db.ts, no native
// modules to compile). It stores contributed images + their device metadata +
// marker analysis, and can ingest a shared Google Photos album. There is no
// Google GenAI / Gemini dependency anywhere.

import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createServer as createViteServer } from 'vite';
import exifr from 'exifr';
import { db, UPLOAD_DIR, ROOT, rowToRecord, safeJson, storeImage, imageSize, countImages, type Row } from './db.ts';
import { runSeed } from './seed-data.ts';

const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json({ limit: '60mb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1y', immutable: true }));

app.get('/api/health', (_req, res) => res.json({ ok: true, engine: 'node:sqlite' }));

// --- list / search ---------------------------------------------------------
app.get('/api/images', (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const marker = String(req.query.marker ?? 'all');
  let rows = (db.prepare('SELECT * FROM images ORDER BY uploaded_at DESC').all() as Row[]).map(rowToRecord);
  if (marker === 'yes') rows = rows.filter(r => r.marker?.markerFound);
  if (marker === 'no') rows = rows.filter(r => !r.marker?.markerFound);
  if (q) rows = rows.filter(r =>
    [r.title, r.species, r.contributor, r.notes, ...(r.tags || [])].filter(Boolean).join(' ').toLowerCase().includes(q));
  res.json(rows);
});

app.get('/api/images/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM images WHERE id = ?').get(req.params.id) as Row | undefined;
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(rowToRecord(row));
});

// --- create ----------------------------------------------------------------
app.post('/api/images', (req, res) => {
  try {
    const b = req.body ?? {};
    if (!b.imageBase64 || !b.title) return res.status(400).json({ error: 'imageBase64 and title are required' });
    const buffer = Buffer.from(String(b.imageBase64).replace(/^data:[^,]+,/, ''), 'base64');
    if (!buffer.length) return res.status(400).json({ error: 'empty image' });
    const dims = imageSize(buffer);
    const rec = storeImage({
      buffer, mime: b.mime || 'image/jpeg',
      title: b.title, species: b.species, notes: b.notes, contributor: b.contributor,
      source: b.source || 'upload', sourceRef: b.sourceRef, license: b.license, tags: b.tags,
      width: b.width || dims?.[0] || 0, height: b.height || dims?.[1] || 0,
      origWidth: b.origWidth, origHeight: b.origHeight, origFileSize: b.origFileSize,
      capturedAt: b.capturedAt, metadata: b.metadata, marker: b.marker,
    });
    res.status(201).json(rec);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// --- update marker / delete ------------------------------------------------
app.patch('/api/images/:id/marker', (req, res) => {
  const row = db.prepare('SELECT id FROM images WHERE id = ?').get(req.params.id) as Row | undefined;
  if (!row) return res.status(404).json({ error: 'not found' });
  db.prepare('UPDATE images SET marker = ? WHERE id = ?')
    .run(req.body?.marker ? JSON.stringify(req.body.marker) : null, req.params.id);
  res.json(rowToRecord(db.prepare('SELECT * FROM images WHERE id = ?').get(req.params.id) as Row));
});

app.delete('/api/images/:id', (req, res) => {
  const row = db.prepare('SELECT filename FROM images WHERE id = ?').get(req.params.id) as Row | undefined;
  if (!row) return res.status(404).json({ error: 'not found' });
  try { fs.unlinkSync(path.join(UPLOAD_DIR, row.filename)); } catch { /* already gone */ }
  db.prepare('DELETE FROM images WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- stats -----------------------------------------------------------------
app.get('/api/stats', (_req, res) => {
  const rows = db.prepare('SELECT species, contributor, file_size, uploaded_at, marker FROM images').all() as Row[];
  const species = new Set<string>(), contributors = new Set<string>();
  let withMarker = 0, totalBytes = 0, lastUploadAt: string | null = null;
  for (const r of rows) {
    if (r.species) species.add(String(r.species).toLowerCase());
    if (r.contributor) contributors.add(String(r.contributor).toLowerCase());
    totalBytes += r.file_size || 0;
    if (r.marker && safeJson<any>(r.marker, {})?.markerFound) withMarker++;
    if (!lastUploadAt || r.uploaded_at > lastUploadAt) lastUploadAt = r.uploaded_at;
  }
  res.json({ totalImages: rows.length, withMarker, species: species.size, contributors: contributors.size, totalBytes, lastUploadAt });
});

// --- export ----------------------------------------------------------------
app.get('/api/export/manifest.json', (_req, res) => {
  const rows = (db.prepare('SELECT * FROM images ORDER BY uploaded_at DESC').all() as Row[]).map(rowToRecord);
  res.setHeader('Content-Disposition', 'attachment; filename="astrobotany_manifest.json"');
  res.json({ generatedAt: new Date().toISOString(), count: rows.length, images: rows });
});

app.get('/api/export/archive.zip', (_req, res) => {
  const rows = (db.prepare('SELECT * FROM images ORDER BY uploaded_at DESC').all() as Row[]).map(rowToRecord);
  const entries: { name: string; data: Buffer }[] = [
    { name: 'manifest.json', data: Buffer.from(JSON.stringify({ generatedAt: new Date().toISOString(), count: rows.length, images: rows }, null, 2)) },
  ];
  for (const r of rows) {
    try { entries.push({ name: `images/${r.filename}`, data: fs.readFileSync(path.join(UPLOAD_DIR, r.filename)) }); } catch { /* skip */ }
  }
  const zip = makeStoreZip(entries);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="astrobotany_database.zip"');
  res.send(zip);
});

// --- Google Photos shared-album ingestion ----------------------------------
// A mobile User-Agent is required: legacy photos.app.goo.gl short links only
// 302-redirect to the real photos.google.com/share/… album for a mobile client
// (Firebase Dynamic Links no longer resolve them server-side for desktop UAs).
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept-Language': 'en-US,en;q=0.9',
};

app.post('/api/ingest/google-photos', async (req, res) => {
  const albumUrl = String(req.body?.albumUrl ?? '').trim();
  if (!/^https:\/\/(photos\.app\.goo\.gl|photos\.google\.com)\//.test(albumUrl)) {
    return res.status(400).json({ error: 'Provide a public Google Photos shared-album link (photos.app.goo.gl/… or photos.google.com/share/…).' });
  }
  const limit = Math.min(Number(req.body?.limit) || 50, 200);
  try {
    const { title, photoBaseUrls } = await scrapeGooglePhotosAlbum(albumUrl);
    const albumName = (title || '').split(' · ')[0].trim();
    const imported: any[] = [];
    const errors: string[] = [];
    let skipped = 0;
    for (const base of photoBaseUrls.slice(0, limit)) {
      try {
        const dl = await fetch(`${base}=w2048`, { headers: BROWSER_HEADERS });
        if (!dl.ok) { skipped++; continue; }
        const buffer = Buffer.from(await dl.arrayBuffer());
        if (buffer.length < 1024) { skipped++; continue; }
        const dims = imageSize(buffer);
        const mime = buffer[0] === 0x89 ? 'image/png' : 'image/jpeg';
        let meta: any = {}, capturedAt: string | null = null;
        try {
          const ex: any = await exifr.parse(buffer, { tiff: true, exif: true, gps: true }).catch(() => null);
          if (ex) {
            if (ex.Make) meta.make = String(ex.Make);
            if (ex.Model) meta.model = String(ex.Model);
            if (typeof ex.latitude === 'number') meta.gpsLatitude = ex.latitude;
            if (typeof ex.longitude === 'number') meta.gpsLongitude = ex.longitude;
            const dt = ex.DateTimeOriginal ?? ex.CreateDate;
            if (dt instanceof Date) capturedAt = dt.toISOString();
          }
        } catch { /* no exif */ }
        imported.push(storeImage({
          buffer, mime,
          title: albumName ? `${albumName} — photo ${imported.length + 1}` : `Google Photos import ${imported.length + 1}`,
          species: req.body?.species, contributor: req.body?.contributor,
          source: 'google-photos', sourceRef: albumUrl,
          license: req.body?.license, tags: Array.isArray(req.body?.tags) ? req.body.tags : undefined,
          width: dims?.[0] || 0, height: dims?.[1] || 0, origFileSize: buffer.length,
          capturedAt, metadata: meta, marker: null,
        }));
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
    res.json({ albumTitle: title, found: photoBaseUrls.length, imported, skipped, errors });
  } catch (e) {
    res.status(502).json({ error: `Could not read the album: ${e instanceof Error ? e.message : String(e)}` });
  }
});

// Fetch a shared-album page and pull per-photo lh3 base URLs from the embedded
// data. Heuristic (Google ships no public API for anonymous shared albums).
export async function scrapeGooglePhotosAlbum(url: string): Promise<{ title: string | null; photoBaseUrls: string[] }> {
  const r = await fetch(url, { headers: BROWSER_HEADERS, redirect: 'follow' });
  if (!r.ok) throw new Error(`album fetch returned ${r.status}`);
  const html = await r.text();

  const titleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? (decodeEntities(titleMatch[1]).replace(/\s*-\s*Google Photos\s*$/i, '').trim() || null) : null;

  const re = /https:\/\/lh3\.googleusercontent\.com\/[A-Za-z0-9_\-/]+/g;
  const seen = new Set<string>();
  const bases: string[] = [];
  for (const m of html.match(re) || []) {
    if (!m.includes('/pw/')) continue;      // shared-album photos live under /pw/
    const base = m.replace(/=[^/]*$/, '');    // strip any trailing size suffix
    if (seen.has(base)) continue;
    seen.add(base); bases.push(base);
  }
  return { title, photoBaseUrls: bases };
}

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

// Minimal store-only ZIP writer (no dependency) for a bundle of compressed JPEGs.
function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ~c >>> 0;
}
export function makeStoreZip(entries: { name: string; data: Buffer }[]): Buffer {
  const locals: Buffer[] = [], centrals: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8'), crc = crc32(e.data), size = e.data.length;
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8); local.writeUInt16LE(0, 10); local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(size, 18); local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28); name.copy(local, 30);
    locals.push(local, e.data);
    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(0, 10); central.writeUInt16LE(0, 12); central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(size, 20); central.writeUInt32LE(size, 24);
    central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42); name.copy(central, 46);
    centrals.push(central); offset += local.length + e.data.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

// --- static client (prod) / vite middleware (dev) --------------------------
async function start() {
  // On a fresh deploy (empty persistent disk) load the real starter images,
  // unless disabled. Idempotent — does nothing once the DB has content.
  if (process.env.AUTO_SEED !== 'false' && countImages() === 0) {
    const n = runSeed(m => console.log(m));
    if (n) console.log(`Auto-seeded ${n} starter image(s).`);
  }

  if (process.env.NODE_ENV === 'production') {
    const dist = path.join(ROOT, 'dist');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  app.listen(PORT, () => console.log(`AstroBotany DB listening on http://localhost:${PORT}`));
}
start();
