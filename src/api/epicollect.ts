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
import { fetchGithubFolder, parseGhId, ghUrl, parseFilenameMeta, metaFor, type GhTarget, type GhFile } from './github';
import { loadLocalEntries, deleteLocalSource } from '../lib/localsource';
import { authConfigured } from '../lib/supabase';
import { CLOUD_SLUG, isCloud, fetchCloudPage } from '../lib/uploads';

export const EC5_BASE = 'https://five.epicollect.net';
export const DEMO_SLUG = 'ec5-api-test';
export const ALL = '__all__';

// A source is either an Epicollect5 project (type omitted / 'ec5') or a GitHub
// image folder (type 'github', slug prefixed "gh:", details in `gh`).
export interface ProjectRef {
  slug: string; name: string; type?: 'ec5' | 'github' | 'local' | 'cloud' | 'youtube';
  gh?: GhTarget; iss?: boolean; metaUrl?: string;
  yt?: { videoId: string; embedUrl: string };
  formRef?: string;
  reference?: { text: string; url: string }; rsmlIndex?: string;
  // Curated provenance for the Datasets tab.
  provenance?: { organism?: string; conditions?: string; description?: string; source?: string };
}

export const isGithub = (slug: string) => slug.startsWith('gh:');
export const isYoutube = (slug: string) => slug.startsWith('yt:');
export const isLocal = (slug: string) => slug.startsWith('local:');

// Images from an ISS payload (e.g. ExoLab): they carry no GPS, so the dashboard
// can estimate an orbital ground-track position from each timestamp instead.
const ISS_RE = /exolab|(^|[^a-z])iss([^a-z]|$)|spacestation|space[-_ ]?station/i;
export function isIssSource(slug: string): boolean {
  const p = getProjects().find(s => s.slug === slug);
  if (p?.iss != null) return p.iss;
  return ISS_RE.test(slug) || ISS_RE.test(p?.name || '');
}

// CoSE projects known to hold (or will hold) calibration images / experiment data.
const BUILTIN: ProjectRef[] = [
  // APEX05 spaceflight root-architecture study (mirrored from Google Drive into
  // GitHub). Images carry a metadata.csv sidecar (condition/day/genotype);
  // RSML traces + analysis code live alongside in the same repo for AstroRoot.
  {
    slug: 'gh:dr-richard-barker/image-analysis-software-and-R-codes/master/APEX05/images',
    name: 'APEX05 — root architecture (Flight vs GC)', type: 'github',
    gh: { owner: 'dr-richard-barker', repo: 'image-analysis-software-and-R-codes', ref: 'master', path: 'APEX05/images' },
    rsmlIndex: 'https://raw.githubusercontent.com/dr-richard-barker/image-analysis-software-and-R-codes/master/APEX05/rsml_index.json',
    provenance: { organism: 'Arabidopsis thaliana', conditions: 'Flight vs Ground control · days 1–8 · genotypes Col-0/cax2-2/cax2-3/rbohD', description: 'Root architecture: 120 curated images + 424 SmartRoot RSML traces (via AstroRoot).', source: 'Google Drive → GitHub mirror' },
  },
  // NASA OSDR plant morphometric imaging (mirrored; discovered via tools/osdr_scan.py).
  {
    slug: 'gh:dr-richard-barker/image-analysis-software-and-R-codes/master/NASA_OSDR/OSD-120/images',
    name: 'NASA OSD-120 — Arabidopsis roots (Flight vs Ground)', type: 'github',
    gh: { owner: 'dr-richard-barker', repo: 'image-analysis-software-and-R-codes', ref: 'master', path: 'NASA_OSDR/OSD-120/images' },
    reference: { text: 'NASA OSDR OSD-120 — Arabidopsis thaliana root morphometric photography (spaceflight vs ground control).', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-120' },
    provenance: { organism: 'Arabidopsis thaliana', conditions: 'Flight vs Ground control · days 3–13 · genotypes Ws/Col-0/Col-0 phyD · light/dark', description: '48 curated root morphometric photographs.', source: 'NASA OSDR OSD-120' },
  },
  {
    slug: 'gh:dr-richard-barker/image-analysis-software-and-R-codes/master/NASA_OSDR/OSD-121/images',
    name: 'NASA OSD-121 — BRIC-16 Arabidopsis', type: 'github',
    gh: { owner: 'dr-richard-barker', repo: 'image-analysis-software-and-R-codes', ref: 'master', path: 'NASA_OSDR/OSD-121/images' },
    reference: { text: 'NASA OSDR OSD-121 — BRIC-16: Arabidopsis morphometric photography (spaceflight vs ground control).', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-121' },
    provenance: { organism: 'Arabidopsis thaliana', conditions: 'Flight vs Ground control', description: 'BRIC-16: 26 morphometric photographs of gravity-perception / cytoskeleton development.', source: 'NASA OSDR OSD-121' },
  },
  {
    slug: 'gh:dr-richard-barker/image-analysis-software-and-R-codes/master/NASA_OSDR/OSD-476/images',
    name: 'NASA OSD-476 — Arabidopsis in lunar regolith', type: 'github',
    gh: { owner: 'dr-richard-barker', repo: 'image-analysis-software-and-R-codes', ref: 'master', path: 'NASA_OSDR/OSD-476/images' },
    reference: { text: 'NASA OSDR OSD-476 — Arabidopsis grown in Apollo lunar regolith (plate/shoot morphometric photography). Paired with the Lunar_regolith_AWG shoot analysis.', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-476' },
    provenance: { organism: 'Arabidopsis thaliana', conditions: 'Grown in Apollo lunar regolith', description: '20 raw plate scans (OSDR) + 20 shoot-analysis stills (Lunar_regolith_AWG).', source: 'NASA OSDR OSD-476 + AWG repo' },
  },
  // TICTOC — cotton spaceflight root architecture (images + timelapse + RSML).
  {
    slug: 'gh:dr-richard-barker/image-analysis-software-and-R-codes/master/TICTOC/images',
    name: 'TICTOC — cotton roots (Flight vs Ground)', type: 'github',
    gh: { owner: 'dr-richard-barker', repo: 'image-analysis-software-and-R-codes', ref: 'master', path: 'TICTOC/images' },
    reference: { text: 'TICTOC — cotton (Gossypium) spaceflight root architecture, flight (ISS) vs ground control, days 3–6.', url: 'https://github.com/dr-richard-barker/TICTOC' },
    rsmlIndex: 'https://raw.githubusercontent.com/dr-richard-barker/image-analysis-software-and-R-codes/master/TICTOC/rsml_index.json',
    provenance: { organism: 'Gossypium (cotton)', conditions: 'Flight (ISS) vs Ground control · days 3–6', description: 'Cotton spaceflight root architecture: images, timelapse and 198 SmartRoot RSML traces.', source: 'TICTOC repo' },
  },
  // APEX03 (Advanced Plant EXperiments 03) — Arabidopsis phenotype photos; related NASA study OSD-193.
  {
    slug: 'gh:dr-richard-barker/image-analysis-software-and-R-codes/master/APEX03',
    name: 'APEX03 — Arabidopsis Sku6 vs Col-0 (Flight vs Ground)', type: 'github',
    gh: { owner: 'dr-richard-barker', repo: 'image-analysis-software-and-R-codes', ref: 'master', path: 'APEX03' },
    reference: { text: 'NASA OSDR OSD-193 — Sku6 mutant vs Col-0 Arabidopsis roots, ground vs spaceflight (APEX03).', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-193' },
    provenance: { organism: 'Arabidopsis thaliana', conditions: 'Flight vs Ground control · 11 days · genotypes Col-0/SKU5/SKU6/WS', description: '11-day phenotype photographs from the APEX03 spaceflight experiment; related to the OSD-193 root transcriptomics study.', source: 'GitHub + NASA OSDR OSD-193' },
  },
  // TASTIE — tomato root architecture ± Trichoderma (images + RSML; RNA-seq excluded).
  {
    slug: 'gh:dr-richard-barker/image-analysis-software-and-R-codes/master/TASTIE_tomato/images',
    name: 'TASTIE — tomato roots ± Trichoderma', type: 'github',
    gh: { owner: 'dr-richard-barker', repo: 'image-analysis-software-and-R-codes', ref: 'master', path: 'TASTIE_tomato/images' },
    reference: { text: 'TASTIE — tomato (Solanum lycopersicum) root architecture ± Trichoderma fungi (APEX10/SVT proposal).', url: 'https://github.com/dr-richard-barker/TASTIE_tomato' },
    rsmlIndex: 'https://raw.githubusercontent.com/dr-richard-barker/image-analysis-software-and-R-codes/master/TASTIE_tomato/rsml_index.json',
    provenance: { organism: 'Solanum lycopersicum (tomato)', conditions: 'Control vs + Trichoderma (fungi)', description: '48 root/plant images + 49 SmartRoot RSML traces (via AstroRoot); RSML basenames match the photos.', source: 'TASTIE_tomato repo' },
  },
  // MadWest Rocketry × AstroBotany — TREES launch: Populus tremula (aspen) ±
  // ectomycorrhiza, flight vs ground (2×2). Growth-arm timelapses (H.264 MP4)
  // committed in the repo; a metadata.csv sidecar labels each by treatment.
  {
    slug: 'gh:dr-richard-barker/madwest-astrobotany/main/assets/timelapse',
    name: 'MadWest TREES — Populus ± ECM (Flight vs Ground)', type: 'github',
    gh: { owner: 'dr-richard-barker', repo: 'madwest-astrobotany', ref: 'main', path: 'assets/timelapse' },
    reference: { text: 'MadWest Rocketry × AstroBotany — high-school sounding-rocket space biology: Populus tremula ± ectomycorrhiza, flight vs ground (2×2), packaged for NASA OSDR.', url: 'https://github.com/dr-richard-barker/madwest-astrobotany' },
    provenance: { organism: 'Populus tremula (aspen)', conditions: '2×2: ± ectomycorrhiza × Flight/Ground', description: '5 H.264 growth timelapse movies (TREES — the program’s 3rd rocket launch).', source: 'MadWest Rocketry × AstroBotany' },
  },
  // TREES raw growth-arm stills (curated from the program's Drive folder).
  {
    slug: 'gh:dr-richard-barker/madwest-astrobotany/main/assets/trees_stills/images',
    name: 'MadWest TREES — growth stills (Populus)', type: 'github',
    gh: { owner: 'dr-richard-barker', repo: 'madwest-astrobotany', ref: 'main', path: 'assets/trees_stills/images' },
    reference: { text: 'MadWest Rocketry × AstroBotany — Populus tremula ± ectomycorrhiza growth-arm stills, flight vs ground (2×2), packaged for NASA OSDR.', url: 'https://github.com/dr-richard-barker/madwest-astrobotany' },
    provenance: { organism: 'Populus tremula (aspen)', conditions: '2×2: ± ectomycorrhiza × Flight/Ground', description: '126 curated growth-arm stills (6 timepoints × 21 plants).', source: 'MadWest Rocketry × AstroBotany' },
  },
  { slug: 'clinostat-collaboration', name: 'Clinostat Collaboration' },
  { slug: 'airi-microgreen-growth-biomass-analysis', name: 'AIRI Microgreen Growth & Biomass' },
  { slug: 'growing-beyond-earth-2021-2022', name: 'Growing Beyond Earth 2021–2022' },
  { slug: 'nasa-roots', name: 'NASA Roots' },
  { 
    slug: 'greencompanions', 
    name: 'GreenCompanions — Aquatic Microgreens',
    formRef: 'ea9a607f7c014276bc7bce0a2e794167_5ff90e8cdb1ba',
    provenance: {
      organism: 'Wolffia australiana / Lemna / Landoltia / Azolla',
      conditions: 'Co-cultures, water systems, growth chambers',
      description: 'Aquatic microgreens and duckweed companions.',
      source: 'Epicollect5 GreenCompanions'
    }
  },
  { slug: 'the-spacechilechallenge-cose', name: 'The SpaceChileChallenge' },
  // ABRS Advanced Biological Research System root time-lapse (NASA spaceflight).
  {
    slug: 'gh:dr-richard-barker/image-analysis-software-and-R-codes/master/ABRS_NASA_Roots_TimeLapse/ABRS_Flight',
    name: 'ABRS Roots time-lapse — Flight', type: 'github',
    gh: { owner: 'dr-richard-barker', repo: 'image-analysis-software-and-R-codes', ref: 'master', path: 'ABRS_NASA_Roots_TimeLapse/ABRS_Flight' },
    reference: { text: 'Paul, Zupanska, Schultz & Ferl (2013). Organ-specific remodeling of the Arabidopsis transcriptome in response to spaceflight. BMC Plant Biology 13:112. doi:10.1186/1471-2229-13-112', url: 'https://pubmed.ncbi.nlm.nih.gov/23919896/' },
    provenance: { organism: 'Arabidopsis thaliana', conditions: 'Spaceflight (ISS)', description: 'ABRS root-growth time-lapse (Flight) — image sequence + playable movies.', source: 'NASA ABRS (Paul et al. 2013)' },
  },
  {
    slug: 'gh:dr-richard-barker/image-analysis-software-and-R-codes/master/ABRS_NASA_Roots_TimeLapse/ABRS_Ground_control',
    name: 'ABRS Roots time-lapse — Ground control', type: 'github',
    gh: { owner: 'dr-richard-barker', repo: 'image-analysis-software-and-R-codes', ref: 'master', path: 'ABRS_NASA_Roots_TimeLapse/ABRS_Ground_control' },
    reference: { text: 'Paul, Zupanska, Schultz & Ferl (2013). Organ-specific remodeling of the Arabidopsis transcriptome in response to spaceflight. BMC Plant Biology 13:112. doi:10.1186/1471-2229-13-112', url: 'https://pubmed.ncbi.nlm.nih.gov/23919896/' },
    provenance: { organism: 'Arabidopsis thaliana', conditions: 'Ground control', description: 'ABRS root-growth time-lapse (Ground control) — image sequence + playable movies.', source: 'NASA ABRS (Paul et al. 2013)' },
  },
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

// The shared cloud collection (only when Supabase auth is configured).
const CLOUD_REF: ProjectRef = { slug: CLOUD_SLUG, name: 'Community uploads', type: 'cloud' };

// Built-ins + custom, de-duplicated by slug. A ?project= slug is added on load.
export function getProjects(): ProjectRef[] {
  const seen = new Set<string>(), out: ProjectRef[] = [];
  const base = authConfigured ? [CLOUD_REF, ...BUILTIN] : BUILTIN;
  for (const p of [...base, ...readCustom()]) {
    if (seen.has(p.slug)) continue; seen.add(p.slug); out.push(p);
  }
  return out;
}
export function addProject(input: string, name?: string): ProjectRef[] {
  let s = input.trim();
  let formRef: string | undefined;

  // Extract from full Epicollect export URL
  // e.g. https://five.epicollect.net/api/export/entries/greencompanions?form_ref=ea9a607f7c014276bc7bce0a2e794167_5ff90e8cdb1ba
  const urlMatch = s.match(/five\.epicollect\.net\/api\/export\/entries\/([^?]+)(?:\?(.+))?/i);
  if (urlMatch) {
    s = urlMatch[1];
    const query = urlMatch[2];
    if (query) {
      const m = query.match(/form_ref=([^&]+)/i);
      if (m) formRef = m[1];
    }
  } else {
    // If it's a slug with query parameters directly, e.g. greencompanions?form_ref=...
    const qMatch = s.match(/^([^?]+)\?(.+)/);
    if (qMatch) {
      s = qMatch[1];
      const m = qMatch[2].match(/form_ref=([^&]+)/i);
      if (m) formRef = m[1];
    }
  }

  s = s.toLowerCase().replace(/\s+/g, '-');
  if (!s) return getProjects();
  
  if (!getProjects().some(p => p.slug === s)) {
    writeCustom([...readCustom(), { 
      slug: s, 
      name: name?.trim() || prettify(s),
      formRef
    }]);
  }
  return getProjects();
}
export function addGithubSource(gh: GhTarget, name: string, iss?: boolean, metaUrl?: string): ProjectRef {
  const slug = `gh:${gh.owner}/${gh.repo}/${gh.ref}/${gh.path}`;
  const existing = getProjects().find(p => p.slug === slug);
  if (existing) return existing;
  const auto = ISS_RE.test(name) || ISS_RE.test(slug);
  const ref: ProjectRef = { slug, name, type: 'github', gh, iss: iss ?? auto, metaUrl };
  writeCustom([...readCustom(), ref]);
  return ref;
}
export function removeProject(slug: string): ProjectRef[] {
  writeCustom(readCustom().filter(p => p.slug !== slug));
  if (isLocal(slug)) deleteLocalSource(slug.replace(/^local:/, '')).catch(() => {});
  if (getActive() === slug) setActive(getProjects()[0]?.slug || DEMO_SLUG);
  return getProjects();
}
export function addLocalSource(id: string, name: string): ProjectRef {
  const slug = `local:${id}`;
  const ref: ProjectRef = { slug, name, type: 'local' };
  if (!getProjects().some(p => p.slug === slug)) writeCustom([...readCustom(), ref]);
  return ref;
}
export const isBuiltin = (slug: string) => BUILTIN.some(p => p.slug === slug);
export const isDemoProject = (slug: string) => slug === DEMO_SLUG;

export function projectName(slug: string): string {
  if (slug === ALL) return 'All projects';
  const found = getProjects().find(p => p.slug === slug);
  if (found) return found.name;
  const gh = parseGhId(slug);
  return gh ? `${gh.repo} · ${gh.path.split('/').pop() || gh.repo}` : slug;
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

// Link to a source's home (GitHub folder or Epicollect5 project page).
export const projectUrl = (slug: string) => {
  const gh = parseGhId(slug);
  return gh ? ghUrl(gh) : `${EC5_BASE}/project/${slug}`;
};
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

// "All": every project merged newest-first (per_page 500 = one request each for
// projects up to 500 entries, and shares cache keys with the Dashboard's
// fetchAllComplete). Per-project failures are collected, not fatal.
export async function fetchAllPage(slugs: string[], perPage = 500): Promise<EntriesPage> {
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

// --- short-lived request cache -------------------------------------------
// A page fetch is keyed by slug|page|perPage and reused for TTL_MS, so flipping
// between the Database and Dashboard (which request the same pages) doesn't
// re-hit Epicollect5's ~5 req/min limit. Marker analysis is applied *after* the
// cache (via hydrate), so locally-saved analysis always shows even on a cache
// hit. Cached values are cloned on read so callers can't mutate the store.
type OnePage = { entries: Ec5Entry[]; total: number; hasNext: boolean };
const TTL_MS = 90_000;
const pageCache = new Map<string, { time: number; value: OnePage }>();
const clone = (v: OnePage): OnePage => ({ ...v, entries: v.entries.map(e => ({ ...e })) });

export function clearCache() { pageCache.clear(); }

async function fetchOne(slug: string, page: number, perPage: number): Promise<OnePage> {
  const key = `${slug}|${page}|${perPage}`;
  const hit = pageCache.get(key);
  if (hit && Date.now() - hit.time < TTL_MS) return clone(hit.value);

  // Shared cloud uploads (Supabase-backed). Not cached — reflects new uploads.
  if (isCloud(slug)) {
    const r = await fetchCloudPage(page, perPage);
    return { entries: r.entries, total: r.total, hasNext: r.hasNext };
  }

  // GitHub folder source: one API call lists the folder (cached in github.ts),
  // then we page over the images client-side.
  if (isGithub(slug)) {
    const src = getProjects().find(p => p.slug === slug);
    const gh = src?.gh || parseGhId(slug);
    if (!gh) throw new Error('bad GitHub source');
    const { images, meta } = await fetchGithubFolder(gh, src?.metaUrl);
    const entries = images.map(f => ghEntry(f, slug, metaFor(meta, f.name)));
    const start = (page - 1) * perPage;
    const value: OnePage = { entries: entries.slice(start, start + perPage), total: entries.length, hasNext: start + perPage < entries.length };
    pageCache.set(key, { time: Date.now(), value });
    return clone(value);
  }

  // YouTube video source: single entry with embed URL as videoUrl
  if (isYoutube(slug)) {
    const src = getProjects().find(p => p.slug === slug);
    if (!src?.yt) throw new Error('YouTube video not found');
    const entry: Ec5Entry = {
      uuid: src.yt.videoId,
      project: slug,
      title: src.name.replace(/^YouTube · /, ''),
      createdAt: '',
      uploadedAt: new Date().toISOString(),
      photoUrl: null,
      thumbUrl: null,
      videoUrl: src.yt.embedUrl,
      fields: [],
      species: null,
      gps: null,
      marker: null,
    };
    const value: OnePage = { entries: page === 1 ? [entry] : [], total: 1, hasNext: false };
    pageCache.set(key, { time: Date.now(), value });
    return clone(value);
  }

  // Local uploaded source: read from IndexedDB (fresh object URLs each load, so
  // don't cache — a cached blob: URL can be revoked/stale after a reload).
  if (isLocal(slug)) {
    const all = await loadLocalEntries(slug);
    const start = (page - 1) * perPage;
    return { entries: all.slice(start, start + perPage), total: all.length, hasNext: start + perPage < all.length };
  }

  const src = getProjects().find(p => p.slug === slug);
  let url = `${EC5_BASE}/api/export/entries/${encodeURIComponent(slug)}?per_page=${perPage}&page=${page}&format=json`;
  if (src?.formRef) {
    url += `&form_ref=${encodeURIComponent(src.formRef)}`;
  }
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (res.status === 429) throw new Error('rate limit reached (5 req/min) — wait a moment');
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const b = await res.json(); if (b?.errors?.[0]?.title) msg = b.errors[0].title; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const j = await res.json();
  const raw: any[] = j?.data?.entries ?? [];
  const value: OnePage = { entries: raw.map(e => mapEntry(e, slug)), total: j?.meta?.total ?? raw.length, hasNext: Boolean(j?.links?.next) };
  pageCache.set(key, { time: Date.now(), value });
  return clone(value);
}

const RESERVED = new Set(['ec5_uuid', 'created_at', 'uploaded_at', 'title']);
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i.test(s);

// Reshape a raw Epicollect5 entry: auto-detect the photo field, collect the rest
// Choose the species/cultivar for an entry from its fields. Prefer an explicit
// cultivar/variety/genotype/species question (matched on the field key OR its
// human label — GBE stores it as "Select the cultivar being reported"); fall
// back to a plant/organism/crop field, but never a purely numeric value (so a
// "plants per tray" count is not mistaken for a species).
const isNumericish = (s: string) => /^[\s\d.,%±+/-]+$/.test(s);
// Tiered so an explicit species wins over a cultivar wins over a genotype/line,
// regardless of field order, and a numeric value is never taken as a species.
const SPECIES_TIERS = [
  /scientific|\bspecies\b|taxon/i,             // true species / scientific name
  /cultivar|variet/i,                          // cultivar (GBE: "Select the cultivar being reported")
  /genotype|ecotype|accession|line|strain/i,   // genetic line
  /speci|(^|[_\s])plant|organism|crop|specimen/i, // weak fallback
];
// Fields that mention a plant but describe its state/measurement, not its
// identity — so "plant health = Good" or "plants per tray = 12" are never taken
// as the species.
const NOT_SPECIES = /health|status|conditio|appearanc|quality|rating|vigou?r|score|grade|\bstage\b|count|number|amount|\bper\b|height|weight|date|time|note|comment/i;
// Rating/scale answers that are never a species name (a "how does the plant
// look?" style question can otherwise slip a "Good"/"Poor" into the species).
const RATING_VALUE = /^(good|poor|fair|great|excellent|ok|okay|healthy|unhealthy|sick|dead|alive|yes|no|n\/?a|none|na|high|med(ium)?|low|normal|abnormal|true|false|present|absent|pass|fail)$/i;
function pickSpecies(fields: { key: string; name: string; value: string }[]): string | null {
  for (const re of SPECIES_TIERS) {
    const f = fields.find(f => f.value && !isNumericish(f.value) && !RATING_VALUE.test(f.value.trim())
      && (re.test(f.key) || re.test(f.name))
      && !NOT_SPECIES.test(f.key) && !NOT_SPECIES.test(f.name));
    if (f) return f.value;
  }
  return null;
}

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
    fields.push({ key, name: prettify(key), value: str });
  }
  species = pickSpecies(fields);

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

// Map a GitHub image file to an entry. Photo = raw URL; metadata comes from an
// optional sidecar record (metadata.csv/.json joined by filename) plus anything
// encoded in the filename.
function ghEntry(f: GhFile, slug: string, meta?: Record<string, string>): Ec5Entry {
  const fromName = parseFilenameMeta(f.name);
  const fields: EntryField[] = [...fromName.fields];
  let species: string | null = null;
  let gps: { lat: number; lng: number } | null = null;
  let capturedAt = fromName.capturedAt;
  let title = f.name;
  let lat: number | null = null, lng: number | null = null;

  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      if (!v) continue;
      if (/^(title|label|caption)$/i.test(k)) { title = v; continue; }
      if (/^(lat|latitude)$/i.test(k)) { const n = parseFloat(v); if (!Number.isNaN(n)) lat = n; continue; }
      if (/^(lon|lng|long|longitude)$/i.test(k)) { const n = parseFloat(v); if (!Number.isNaN(n)) lng = n; continue; }
      if (/date|time|captured/i.test(k)) { const d = new Date(v); if (!isNaN(d.getTime())) capturedAt = d.toISOString(); }
      fields.push({ key: k, name: prettify(k), value: v } as any);
    }
    if (lat != null && lng != null) gps = { lat, lng };
  }
  
  species = pickSpecies(fields.map(f => ({ key: (f as any).key || f.name, name: f.name, value: f.value }))) || fromName.species || null;

  if (fromName.genotype && !fields.some(f => f.name.toLowerCase() === 'genotype')) {
    fields.push({ name: 'Genotype', value: fromName.genotype });
  }
  if (fromName.treatment && !fields.some(f => f.name.toLowerCase() === 'treatment')) {
    fields.push({ name: 'Treatment', value: fromName.treatment });
  }

  fields.push({ name: 'File size', value: f.size > 1_000_000 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB` });

  // Check for videoUrl in metadata (for timelapses linked to external videos)
  const metaVideoUrl = meta?.videoUrl;
  const hasVideoFile = f.video;
  const videoUrl = metaVideoUrl || (hasVideoFile ? f.downloadUrl : null);

  return {
    uuid: f.sha || f.path, project: slug, title,
    createdAt: capturedAt || '', uploadedAt: capturedAt || '',
    // Video entries carry a videoUrl and no photoUrl (there's no still to
    // marker-analyse); image entries carry photo + thumb.
    photoUrl: hasVideoFile || metaVideoUrl ? null : f.downloadUrl,
    thumbUrl: f.downloadUrl,
    videoUrl: videoUrl,
    fields, species, gps, marker: null,
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
