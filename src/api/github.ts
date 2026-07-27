// GitHub folder source. The GitHub contents API and raw.githubusercontent.com
// are both CORS-open (Access-Control-Allow-Origin: *), so a static site can list
// a repo folder and load + analyse its images directly in the browser — no token
// for public repos (unauthenticated limit: 60 requests/hour, and a folder is one
// request). Images are served from raw.githubusercontent.com, so the marker
// detector can read their pixels off a canvas.

export interface GhTarget { owner: string; repo: string; path: string; ref: string; }
export interface GhFile { name: string; path: string; downloadUrl: string; size: number; sha: string; }

const IMG_RE = /\.(jpe?g|png|webp|gif|tiff?|bmp)$/i;

// Accept a full GitHub URL (…/tree/<ref>/<path>, or repo root) or an
// "owner/repo[/path]" shorthand (defaults to the main branch).
export function parseGithub(input: string): GhTarget | null {
  const s = input.trim();
  let m = s.match(/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)/i);
  if (m) return { owner: m[1], repo: m[2].replace(/\.git$/, ''), ref: m[3], path: decodeURIComponent(m[4]).replace(/\/+$/, '') };
  m = s.match(/github\.com\/([^/]+)\/([^/]+)\/?$/i);
  if (m) return { owner: m[1], repo: m[2].replace(/\.git$/, ''), ref: 'main', path: '' };
  m = s.match(/^([^/\s]+)\/([^/\s]+)(?:\/(.+))?$/);
  if (m) return { owner: m[1], repo: m[2].replace(/\.git$/, ''), ref: 'main', path: (m[3] || '').replace(/\/+$/, '') };
  return null;
}

export const ghId = (t: GhTarget) => `gh:${t.owner}/${t.repo}/${t.ref}/${t.path}`;
export function parseGhId(id: string): GhTarget | null {
  const m = id.match(/^gh:([^/]+)\/([^/]+)\/([^/]+)\/(.*)$/);
  return m ? { owner: m[1], repo: m[2], ref: m[3], path: m[4] } : null;
}
export function ghUrl(t: GhTarget): string {
  return `https://github.com/${t.owner}/${t.repo}/tree/${t.ref}/${t.path}`;
}
export function defaultName(t: GhTarget): string {
  const last = t.path.split('/').filter(Boolean).pop();
  return last ? `${t.repo} · ${last}` : t.repo;
}

// Per-image metadata keyed by (normalised) filename, from a sidecar file.
export type MetaMap = Map<string, Record<string, string>>;
export interface GhFolder { images: GhFile[]; meta: MetaMap; metaFile: string | null; }

const folderCache = new Map<string, { time: number; folder: GhFolder }>();
const TTL_MS = 5 * 60_000;
const META_RE = /^(metadata|data|images?)\.(csv|tsv|json)$/i;

export async function fetchGithubFolder(t: GhTarget): Promise<GhFolder> {
  const key = ghId(t);
  const hit = folderCache.get(key);
  if (hit && Date.now() - hit.time < TTL_MS) return hit.folder;

  const path = t.path.split('/').map(encodeURIComponent).join('/');
  const url = `https://api.github.com/repos/${t.owner}/${t.repo}/contents/${path}?ref=${encodeURIComponent(t.ref)}`;
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (res.status === 403) throw new Error('GitHub API rate limit reached (60/hr for anonymous) — try again later');
  if (res.status === 404) throw new Error('Folder not found — check owner/repo/branch/path');
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
  const j = await res.json();
  if (!Array.isArray(j)) throw new Error('That path is a file, not a folder');

  const images: GhFile[] = j
    .filter((f: any) => f.type === 'file' && IMG_RE.test(f.name) && f.download_url)
    .map((f: any) => ({ name: f.name, path: f.path, downloadUrl: f.download_url, size: f.size, sha: f.sha }));

  let meta: MetaMap = new Map();
  let metaFile: string | null = null;
  const sidecar = j.find((f: any) => f.type === 'file' && META_RE.test(f.name) && f.download_url);
  if (sidecar) {
    try {
      const text = await (await fetch(sidecar.download_url)).text();
      meta = /\.json$/i.test(sidecar.name) ? parseJsonMeta(text) : parseDelimitedMeta(text, /\.tsv$/i.test(sidecar.name) ? '\t' : ',');
      if (meta.size) metaFile = sidecar.name;
    } catch { /* sidecar unreadable — ignore */ }
  }

  const folder: GhFolder = { images, meta, metaFile };
  folderCache.set(key, { time: Date.now(), folder });
  return folder;
}

// Back-compat: just the images (used to validate a folder before adding it).
export async function fetchGithubImages(t: GhTarget): Promise<GhFile[]> {
  return (await fetchGithubFolder(t)).images;
}

// Look up a record for an image by full name, then by basename (no extension).
export function metaFor(meta: MetaMap, filename: string): Record<string, string> | undefined {
  return meta.get(filename.toLowerCase()) || meta.get(filename.toLowerCase().replace(/\.[^.]+$/, ''));
}

const FILE_KEY_RE = /^(file|filename|image|images|photo|name|img)$/i;

function indexByFilename(rows: Record<string, string>[]): MetaMap {
  const map: MetaMap = new Map();
  for (const row of rows) {
    const keyCol = Object.keys(row).find(k => FILE_KEY_RE.test(k.trim()));
    const fname = keyCol ? String(row[keyCol]).trim() : '';
    if (!fname) continue;
    const rec: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) if (!FILE_KEY_RE.test(k.trim())) rec[k.trim()] = v;
    map.set(fname.toLowerCase(), rec);
    map.set(fname.toLowerCase().replace(/\.[^.]+$/, ''), rec);
  }
  return map;
}

// Parse a sidecar file's text into a filename→record map (shared with uploads).
export function parseSidecarText(text: string, filename: string): MetaMap {
  return /\.json$/i.test(filename)
    ? parseJsonMeta(text)
    : parseDelimitedMeta(text, /\.tsv$/i.test(filename) ? '\t' : ',');
}

function parseJsonMeta(text: string): MetaMap {
  const j = JSON.parse(text);
  if (Array.isArray(j)) return indexByFilename(j.map(stringifyValues));
  // object keyed by filename → { "img.jpg": {species: …}, … }
  const map: MetaMap = new Map();
  for (const [fname, rec] of Object.entries(j)) {
    const r = stringifyValues(rec as any);
    map.set(fname.toLowerCase(), r);
    map.set(fname.toLowerCase().replace(/\.[^.]+$/, ''), r);
  }
  return map;
}
function stringifyValues(o: any): Record<string, string> {
  const r: Record<string, string> = {};
  for (const [k, v] of Object.entries(o || {})) r[k] = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return r;
}

// Minimal delimited parser with quoted-field support.
function parseDelimitedMeta(text: string, delim: string): MetaMap {
  const rows = splitRows(text);
  if (rows.length < 2) return new Map();
  const headers = splitLine(rows[0], delim).map(h => h.trim());
  const objs = rows.slice(1).filter(r => r.trim()).map(line => {
    const cells = splitLine(line, delim);
    const o: Record<string, string> = {};
    headers.forEach((h, i) => { o[h] = (cells[i] ?? '').trim(); });
    return o;
  });
  return indexByFilename(objs);
}
function splitRows(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').split('\n');
}
function splitLine(line: string, delim: string): string[] {
  const out: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

// Pull metadata encoded in a filename (the ExoLab imaging rig style:
// "imaging_lens_position_7.0_cam_0_1730496602.jpg").
export function parseFilenameMeta(name: string): { fields: { name: string; value: string }[]; capturedAt: string | null } {
  const fields: { name: string; value: string }[] = [];
  let capturedAt: string | null = null;
  const ts = name.match(/(?:^|[_-])(\d{10})(?:\D|$)/);
  if (ts) {
    const d = new Date(Number(ts[1]) * 1000);
    if (!isNaN(d.getTime())) { capturedAt = d.toISOString(); fields.push({ name: 'Captured', value: d.toLocaleString() }); }
  }
  const pos = name.match(/position[_-]?([\d.]+)/i);
  if (pos) fields.push({ name: 'Lens position', value: pos[1] });
  const cam = name.match(/cam[_-]?(\d+)/i);
  if (cam) fields.push({ name: 'Camera', value: cam[1] });
  return { fields, capturedAt };
}
