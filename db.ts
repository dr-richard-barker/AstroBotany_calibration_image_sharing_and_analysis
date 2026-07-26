// Shared storage layer: Node built-in SQLite (node:sqlite, no native build) +
// image files on disk. Imported by both the server and the seed script.

import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
// @ts-ignore — node:sqlite ships with Node 22 but has no bundled @types yet.
import { DatabaseSync } from 'node:sqlite';

export const ROOT = process.cwd();
export const DATA_DIR = path.join(ROOT, 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'astrobotany.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS images (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    species       TEXT,
    notes         TEXT,
    contributor   TEXT,
    source        TEXT NOT NULL,
    source_ref    TEXT,
    license       TEXT,
    tags          TEXT,
    filename      TEXT NOT NULL,
    mime          TEXT NOT NULL,
    width         INTEGER NOT NULL,
    height        INTEGER NOT NULL,
    orig_width    INTEGER,
    orig_height   INTEGER,
    file_size     INTEGER NOT NULL,
    orig_file_size INTEGER,
    captured_at   TEXT,
    uploaded_at   TEXT NOT NULL,
    metadata      TEXT,
    marker        TEXT
  );
`);

export type Row = Record<string, any>;

export function safeJson<T>(s: any, fallback: T): T {
  if (s == null) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export function rowToRecord(r: Row) {
  return {
    id: r.id, title: r.title, species: r.species, notes: r.notes,
    contributor: r.contributor, source: r.source, sourceRef: r.source_ref,
    license: r.license, tags: safeJson(r.tags, []),
    filename: r.filename, mime: r.mime,
    width: r.width, height: r.height, origWidth: r.orig_width, origHeight: r.orig_height,
    fileSize: r.file_size, origFileSize: r.orig_file_size,
    capturedAt: r.captured_at, uploadedAt: r.uploaded_at,
    metadata: safeJson(r.metadata, {}), marker: safeJson(r.marker, null),
    url: `/uploads/${r.filename}`,
  };
}

const insertStmt = db.prepare(`
  INSERT INTO images (id,title,species,notes,contributor,source,source_ref,license,tags,
    filename,mime,width,height,orig_width,orig_height,file_size,orig_file_size,
    captured_at,uploaded_at,metadata,marker)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);

export interface StoreInput {
  buffer: Buffer; mime: string;
  title: string; species?: string | null; notes?: string | null; contributor?: string | null;
  source: string; sourceRef?: string | null; license?: string | null; tags?: string[];
  width: number; height: number; origWidth?: number | null; origHeight?: number | null; origFileSize?: number | null;
  capturedAt?: string | null; metadata?: any; marker?: any;
  id?: string;
}

export function storeImage(input: StoreInput) {
  const id = input.id ?? crypto.randomUUID();
  const ext = input.mime === 'image/png' ? 'png' : 'jpg';
  const filename = `${id}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), input.buffer);
  const uploadedAt = new Date().toISOString();
  insertStmt.run(
    id, input.title, input.species ?? null, input.notes ?? null, input.contributor ?? null,
    input.source, input.sourceRef ?? null, input.license ?? null, JSON.stringify(input.tags ?? []),
    filename, input.mime, input.width, input.height, input.origWidth ?? null, input.origHeight ?? null,
    input.buffer.length, input.origFileSize ?? null,
    input.capturedAt ?? null, uploadedAt,
    JSON.stringify(input.metadata ?? {}), input.marker ? JSON.stringify(input.marker) : null,
  );
  return rowToRecord(db.prepare('SELECT * FROM images WHERE id = ?').get(id) as Row);
}

// Read pixel dimensions from a JPEG/PNG header (no image-decoder dependency).
export function imageSize(buf: Buffer): [number, number] | null {
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    while (o + 9 < buf.length) {
      if (buf[o] !== 0xff) { o++; continue; }
      const marker = buf[o + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return [buf.readUInt16BE(o + 7), buf.readUInt16BE(o + 5)];
      }
      o += 2 + buf.readUInt16BE(o + 2);
    }
  }
  return null;
}

export function countImages(): number {
  return (db.prepare('SELECT COUNT(*) n FROM images').get() as Row).n as number;
}
