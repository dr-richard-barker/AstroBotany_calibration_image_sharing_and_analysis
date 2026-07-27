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

const folderCache = new Map<string, { time: number; files: GhFile[] }>();
const TTL_MS = 5 * 60_000;

export async function fetchGithubImages(t: GhTarget): Promise<GhFile[]> {
  const key = ghId(t);
  const hit = folderCache.get(key);
  if (hit && Date.now() - hit.time < TTL_MS) return hit.files;

  const path = t.path.split('/').map(encodeURIComponent).join('/');
  const url = `https://api.github.com/repos/${t.owner}/${t.repo}/contents/${path}?ref=${encodeURIComponent(t.ref)}`;
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (res.status === 403) throw new Error('GitHub API rate limit reached (60/hr for anonymous) — try again later');
  if (res.status === 404) throw new Error('Folder not found — check owner/repo/branch/path');
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
  const j = await res.json();
  if (!Array.isArray(j)) throw new Error('That path is a file, not a folder');
  const files: GhFile[] = j
    .filter((f: any) => f.type === 'file' && IMG_RE.test(f.name) && f.download_url)
    .map((f: any) => ({ name: f.name, path: f.path, downloadUrl: f.download_url, size: f.size, sha: f.sha }));
  folderCache.set(key, { time: Date.now(), files });
  return files;
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
