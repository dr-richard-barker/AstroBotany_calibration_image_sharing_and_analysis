// Epicollect5 read-only data layer. The Epicollect5 API is CORS-open
// (Access-Control-Allow-Origin: *) for public projects, so this static site
// talks to it directly from the browser — no server, no API key.
//
//   entries: GET https://five.epicollect.net/api/export/entries/{slug}
//   media:   GET https://five.epicollect.net/api/media/{slug}?type=photo&format=…&name=…
//
// The photo field already comes back as a full media URL, so we mostly just
// reshape entries for the gallery.

import type { Ec5Entry, EntryField, MarkerAnalysis } from '../types';

export const EC5_BASE = 'https://five.epicollect.net';
const SLUG_KEY = 'ec5-project';
const DEFAULT_SLUG = 'ec5-api-test'; // Epicollect5's public demo project

// Project slug resolution: ?project= in the URL wins, then localStorage, then
// the public demo (so the app is never blank on first load).
export function getProjectSlug(): string {
  const fromUrl = new URLSearchParams(location.search).get('project');
  if (fromUrl) { localStorage.setItem(SLUG_KEY, fromUrl); return fromUrl; }
  return localStorage.getItem(SLUG_KEY) || DEFAULT_SLUG;
}
export function setProjectSlug(slug: string) {
  const s = slug.trim();
  if (s) localStorage.setItem(SLUG_KEY, s); else localStorage.removeItem(SLUG_KEY);
}
export const isDemoProject = (slug: string) => slug === DEFAULT_SLUG;

export const projectUrl = (slug: string) => `${EC5_BASE}/project/${slug}`;
export const addEntryUrl = (slug: string) => `${EC5_BASE}/project/${slug}/data`;

export interface EntriesPage {
  entries: Ec5Entry[];
  total: number;
  page: number;
  lastPage: number;
  hasNext: boolean;
}

export async function fetchEntriesPage(slug: string, page = 1, perPage = 50): Promise<EntriesPage> {
  const url = `${EC5_BASE}/api/export/entries/${encodeURIComponent(slug)}?per_page=${perPage}&page=${page}&format=json`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (res.status === 429) throw new Error('Epicollect5 rate limit reached (5 requests/min) — wait a moment and retry.');
  if (!res.ok) {
    let msg = `Epicollect5 returned ${res.status}`;
    try { const b = await res.json(); if (b?.errors?.[0]?.title) msg = b.errors[0].title; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const j = await res.json();
  const rawEntries: any[] = j?.data?.entries ?? [];
  const meta = j?.meta ?? {};
  return {
    entries: rawEntries.map(mapEntry),
    total: meta.total ?? rawEntries.length,
    page: meta.current_page ?? page,
    lastPage: meta.last_page ?? page,
    hasNext: Boolean(j?.links?.next),
  };
}

const RESERVED = new Set(['ec5_uuid', 'created_at', 'uploaded_at', 'title']);

// Reshape a raw Epicollect5 entry: auto-detect the photo field, collect the
// rest as display metadata, and pull out species / GPS heuristically.
export function mapEntry(raw: any): Ec5Entry {
  let photoUrl: string | null = null;
  let photoKey: string | null = null;
  const fields: EntryField[] = [];
  let species: string | null = null;
  let gps: { lat: number; lng: number } | null = null;

  for (const [key, value] of Object.entries(raw)) {
    if (RESERVED.has(key)) continue;
    // photo field: value is the media endpoint URL
    if (typeof value === 'string' && value.includes('/api/media/') && value.includes('type=photo')) {
      photoUrl = value; photoKey = key; continue;
    }
    // location field: object carrying latitude/longitude
    if (value && typeof value === 'object' && 'latitude' in (value as any) && 'longitude' in (value as any)) {
      const lat = Number((value as any).latitude), lng = Number((value as any).longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && (lat || lng)) {
        gps = { lat, lng };
        fields.push({ name: prettify(key), value: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
      }
      continue;
    }
    const str = formatValue(value);
    if (!str) continue;
    if (/speci|taxon|plant|organism/i.test(key) && !species) species = str;
    fields.push({ name: prettify(key), value: str });
  }

  return {
    uuid: raw.ec5_uuid,
    title: raw.title || '(untitled entry)',
    createdAt: raw.created_at || '',
    uploadedAt: raw.uploaded_at || '',
    photoUrl,
    thumbUrl: photoUrl ? photoUrl.replace(/format=[^&]+/, 'format=entry_thumb') : null,
    fields,
    species,
    gps,
    marker: null,
  };
  void photoKey;
}

export function originalToThumb(url: string): string {
  return url.replace(/format=[^&]+/, 'format=entry_thumb');
}

function formatValue(v: unknown): string {
  if (v == null || v === '') return '';
  if (Array.isArray(v)) return v.map(formatValue).filter(Boolean).join(', ');
  if (typeof v === 'object') return '';
  return String(v);
}
function prettify(key: string): string {
  return key.replace(/^\d+_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ---- local marker-analysis cache (Epicollect5 API is read-only) ----
const markerKey = (slug: string, uuid: string) => `ec5-marker:${slug}:${uuid}`;

export function loadMarker(slug: string, uuid: string): MarkerAnalysis | null {
  try { const s = localStorage.getItem(markerKey(slug, uuid)); return s ? JSON.parse(s) : null; }
  catch { return null; }
}
export function saveMarker(slug: string, uuid: string, marker: MarkerAnalysis) {
  try { localStorage.setItem(markerKey(slug, uuid), JSON.stringify(marker)); } catch { /* quota */ }
}
export function clearMarker(slug: string, uuid: string) {
  try { localStorage.removeItem(markerKey(slug, uuid)); } catch { /* ignore */ }
}
export function hydrateMarkers(slug: string, entries: Ec5Entry[]): Ec5Entry[] {
  return entries.map(e => ({ ...e, marker: loadMarker(slug, e.uuid) }));
}
