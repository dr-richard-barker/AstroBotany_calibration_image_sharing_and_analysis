// Fetch wrappers for the AstroBotany image database API.
import type { ImageRecord, DatabaseStats, CaptureMetadata, MarkerAnalysis } from '../types';

const withUrl = (r: ImageRecord): ImageRecord => ({ ...r, url: `/uploads/${r.filename}` });

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try { const b = await res.json(); if (b?.error) msg = b.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function listImages(params: { q?: string; marker?: 'all' | 'yes' | 'no' } = {}): Promise<ImageRecord[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.marker && params.marker !== 'all') qs.set('marker', params.marker);
  const res = await fetch(`/api/images?${qs.toString()}`);
  const rows = await jsonOrThrow<ImageRecord[]>(res);
  return rows.map(withUrl);
}

export async function getImage(id: string): Promise<ImageRecord> {
  return withUrl(await jsonOrThrow<ImageRecord>(await fetch(`/api/images/${id}`)));
}

export interface UploadPayload {
  imageBase64: string;          // compressed JPEG, base64 (no data: prefix needed)
  mime: string;
  width: number;
  height: number;
  origWidth?: number;
  origHeight?: number;
  origFileSize?: number;
  title: string;
  species?: string;
  notes?: string;
  contributor?: string;
  source: string;               // 'upload' | 'camera' | 'google-photos'
  sourceRef?: string;
  license?: string;
  tags?: string[];
  capturedAt?: string | null;
  metadata?: CaptureMetadata;
  marker?: MarkerAnalysis | null;
}

export async function uploadImage(payload: UploadPayload): Promise<ImageRecord> {
  const res = await fetch('/api/images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return withUrl(await jsonOrThrow<ImageRecord>(res));
}

export async function updateMarker(id: string, marker: MarkerAnalysis): Promise<ImageRecord> {
  const res = await fetch(`/api/images/${id}/marker`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ marker }),
  });
  return withUrl(await jsonOrThrow<ImageRecord>(res));
}

export async function deleteImage(id: string): Promise<void> {
  const res = await fetch(`/api/images/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`delete failed: ${res.status}`);
}

export async function getStats(): Promise<DatabaseStats> {
  return jsonOrThrow<DatabaseStats>(await fetch('/api/stats'));
}

export interface IngestResult {
  albumTitle: string | null;
  found: number;
  imported: ImageRecord[];
  skipped: number;
  errors: string[];
}

// Kick off a Google Photos shared-album ingestion. `defaults` seed the
// contributor / species / license on every imported photo.
export async function ingestGooglePhotos(
  albumUrl: string,
  defaults: { contributor?: string; species?: string; license?: string; tags?: string[]; limit?: number } = {},
): Promise<IngestResult> {
  const res = await fetch('/api/ingest/google-photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ albumUrl, ...defaults }),
  });
  const out = await jsonOrThrow<IngestResult>(res);
  return { ...out, imported: out.imported.map(withUrl) };
}

export const manifestUrl = '/api/export/manifest.json';
export const archiveUrl = '/api/export/archive.zip';
