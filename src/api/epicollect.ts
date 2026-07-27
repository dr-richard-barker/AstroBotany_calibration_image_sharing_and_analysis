// Epicollect5 read-only data layer. The Epicollect5 API is CORS-open
// (Access-Control-Allow-Origin: *) for public projects, so this static site
// talks to it directly from the browser — no server, no API key.
//
//   entries: GET https://five.epicollect.net/api/export/entries/{slug}
//   media:   GET https://five.epicollect.net/api/media/{slug}?type=photo&format=…&name=…
//
// Supports several projects: a built-in list plus any the user adds, browsed one
// at a time or merged with "All".

import type { Ec5Entry, EntryField, MarkerAnalysis } from '../types';

export const EC5_BASE = 'https://five.epicollect.net';
export const DEMO_SLUG = 'ec5-api-test';
export const ALL = '__all__';

export interface ProjectRef { slug: string; name: string; }

// CoSE projects known to hold (or will hold) calibration images / experiment data.
const BUILTIN: ProjectRef[] = [
  { slug: 'clinostat-collaboration', name: 'Clinostat Collaboration' },
  { slug: 'airi-microgreen-growth-biomass-analysis', name: 'AIRI Microgreen Growth & Biomass' },
  { slug: 'growing-beyond-earth-2021-2022', name: 'Growing Beyond Earth 2021–2022' },
];

const CUSTOM_KEY = 'ec5-projects'; // user-added ProjectRef[]
const ACTIVE_KEY = 'ec5-active';   // a slug, or ALL

function readCustom(): ProjectRef[] {
  try { const s = localStorage.getItem(CUSTOM_KEY); const a = s ? JSON.parse(s) : []; return Array.isArray(a) ? a : []; }
  catch { return []; }
}
function writeCustom(list: ProjectRef[]) {
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(list)); } catch { /* quota */ }
}

// Built-ins + custom, de-duplicated by slug. A ?project= slug is added on load.
export function getProjects(): ProjectRef[] {
  const seen = new Set<string>(), out: ProjectRef[] = [];
  for (const p of [...BUILTIN, ...readCustom()]) {
    if (seen.has(p.slug)) continue; seen.add(p.slug); out.push(p);
  }
  return out;
}
export function addProject(slug: string, name?: string): ProjectRef[] {
  const s = slug.trim().toLowerCase().replace(/\s+/g, '-');
  if (!s) return getProjects();
  if (!getProjects().some(p => p.slug === s)) writeCustom([...readCustom(), { slug: s, name: name?.trim() || prettify(s) }]);
  return getProjects();
}
export function removeProject(slug: string): ProjectRef[] {
  writeCustom(readCustom().filter(p => p.slug !== slug));
  if (getActive() === slug) setActive(getProjects()[0]?.slug || DEMO_SLUG);
  return getProjects();
}
export const isBuiltin = (slug: string) => BUILTIN.some(p => p.slug === slug);
export const isDemoProject = (slug: string) => slug === DEMO_SLUG;

export function projectName(slug: string): string {
  if (slug === ALL) return 'All projects';
  return getProjects().find(p => p.slug === slug)?.name || slug;
}

// Active selection: ?project= wins on load, else stored, else the first project.
export function getActive(): string {
  const fromUrl = new URLSearchParams(location.search).get('project');
  if (fromUrl) { addProject(fromUrl); localStorage.setItem(ACTIVE_KEY, fromUrl); return fromUrl; }
  const stored = localStorage.getItem(ACTIVE_KEY);
  if (stored && (stored === ALL || getProjects().some(p => p.slug === stored))) return stored;
  // Default to the combined view when there are several projects.
  return getProjects().length > 1 ? ALL : (getProjects()[0]?.slug || DEMO_SLUG);
}
export function setActive(sel: string) {
  try { localStorage.setItem(ACTIVE_KEY, sel); } catch { /* ignore */ }
}

export const projectUrl = (slug: string) => `${EC5_BASE}/project/${slug}`;
export const addEntryUrl = (slug: string) => `${EC5_BASE}/project/${slug}/data`;

export interface EntriesPage {
  entries: Ec5Entry[];
  total: number;
  page: number;
  hasNext: boolean;
  errors: string[];
}

export async function fetchEntriesPage(slug: string, page = 1, perPage = 50): Promise<EntriesPage> {
  const { entries, total, hasNext } = await fetchOne(slug, page, perPage);
  return { entries: hydrate(entries), total, page, hasNext, errors: [] };
}

// "All": first page of every project, merged newest-first. Per-project failures
// are collected rather than failing the whole load.
export async function fetchAllPage(slugs: string[], perPage = 50): Promise<EntriesPage> {
  const results = await Promise.allSettled(slugs.map(s => fetchOne(s, 1, perPage)));
  const entries: Ec5Entry[] = [];
  const errors: string[] = [];
  let total = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') { entries.push(...r.value.entries); total += r.value.total; }
    else errors.push(`${projectName(slugs[i])}: ${r.reason?.message || r.reason}`);
  });
  entries.sort((a, b) => (b.uploadedAt > a.uploadedAt ? 1 : -1));
  return { entries: hydrate(entries), total, page: 1, hasNext: false, errors };
}

// Every entry across the given projects, fully paginated (for the dashboard).
// Per-project failures are collected rather than aborting the whole load.
// perPage 500 (the API max) keeps most projects to a single request, which
// matters because entries are rate-limited to ~5 requests/min.
export async function fetchAllComplete(slugs: string[], perPage = 500, maxPages = 6): Promise<{ entries: Ec5Entry[]; errors: string[] }> {
  const errors: string[] = [];
  const all: Ec5Entry[] = [];
  await Promise.all(slugs.map(async slug => {
    try {
      let page = 1, more = true;
      while (more && page <= maxPages) {
        const r = await fetchOne(slug, page, perPage);
        all.push(...r.entries);
        more = r.hasNext; page++;
      }
    } catch (e) {
      errors.push(`${projectName(slug)}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }));
  all.sort((a, b) => (b.uploadedAt > a.uploadedAt ? 1 : -1));
  return { entries: hydrate(all), errors };
}

async function fetchOne(slug: string, page: number, perPage: number): Promise<{ entries: Ec5Entry[]; total: number; hasNext: boolean }> {
  const url = `${EC5_BASE}/api/export/entries/${encodeURIComponent(slug)}?per_page=${perPage}&page=${page}&format=json`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (res.status === 429) throw new Error('rate limit reached (5 req/min) — wait a moment');
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const b = await res.json(); if (b?.errors?.[0]?.title) msg = b.errors[0].title; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const j = await res.json();
  const raw: any[] = j?.data?.entries ?? [];
  return { entries: raw.map(e => mapEntry(e, slug)), total: j?.meta?.total ?? raw.length, hasNext: Boolean(j?.links?.next) };
}

const RESERVED = new Set(['ec5_uuid', 'created_at', 'uploaded_at', 'title']);
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i.test(s);

// Reshape a raw Epicollect5 entry: auto-detect the photo field, collect the rest
// as display metadata, and pull out species / GPS / a human title.
export function mapEntry(raw: any, slug: string): Ec5Entry {
  let photoUrl: string | null = null;
  const fields: (EntryField & { key: string })[] = [];
  let species: string | null = null;
  let gps: { lat: number; lng: number } | null = null;

  for (const [key, value] of Object.entries(raw)) {
    if (RESERVED.has(key)) continue;
    if (typeof value === 'string' && value.includes('/api/media/') && value.includes('type=photo')) {
      photoUrl = value; continue;
    }
    if (value && typeof value === 'object' && 'latitude' in (value as any) && 'longitude' in (value as any)) {
      const lat = Number((value as any).latitude), lng = Number((value as any).longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && (lat || lng)) {
        gps = { lat, lng };
        fields.push({ key, name: prettify(key), value: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
      }
      continue;
    }
    const str = formatValue(value);
    if (!str) continue;
    if (/speci|taxon|plant|organism/i.test(key) && !species) species = str;
    fields.push({ key, name: prettify(key), value: str });
  }

  let title = raw.title as string;
  let titleKey: string | null = null;
  if (!title || isUuid(title)) {
    const named = fields.find(f => /name|title/i.test(f.key));
    if (named) { title = named.value; titleKey = named.key; }
    else if (species) { title = species; }
    else if (fields[0]) { title = fields[0].value; titleKey = fields[0].key; }
    else { title = '(untitled entry)'; }
  }

  return {
    uuid: raw.ec5_uuid, project: slug, title,
    createdAt: raw.created_at || '', uploadedAt: raw.uploaded_at || '',
    photoUrl,
    thumbUrl: photoUrl ? photoUrl.replace(/format=[^&]+/, 'format=entry_thumb') : null,
    fields: fields.filter(f => f.key !== titleKey).map(({ name, value }) => ({ name, value })),
    species, gps, marker: null,
  };
}

function formatValue(v: unknown): string {
  if (v == null || v === '') return '';
  if (Array.isArray(v)) return v.map(formatValue).filter(Boolean).join(', ');
  if (typeof v === 'object') return '';
  return String(v);
}
function prettify(key: string): string {
  return key.replace(/^\d+_/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
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
function hydrate(entries: Ec5Entry[]): Ec5Entry[] {
  return entries.map(e => ({ ...e, marker: loadMarker(e.project, e.uuid) }));
}
