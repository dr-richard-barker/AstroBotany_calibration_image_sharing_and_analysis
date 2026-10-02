import { Sprout, FlaskConical, GitBranch, Timer, Brush, Microscope, type LucideIcon } from 'lucide-react';
import { ALL_RSML_INDEX_URL, ASTROROOT_DASHBOARD_URL, rsmlDashboardUrl } from './lib/rsml';
import { ALL } from './api/epicollect';

// Sibling CoSE image-analysis tools. `launch: 'image'` tools read `imgParam` to
// auto-load an image passed from this database; `launch: 'rsml'` tools instead
// load the combined RSML root-trace manifest (no per-image launch); `launch:
// 'standalone'` tools take no per-entry handoff at all — they just open
// embedded, for the user to feed their own input (e.g. a whole time-lapse
// series a single database entry can't represent yet); `launch: 'dataset'`
// tools work on a whole collection and are handed the collection currently
// selected here (`?collection=<slug>`, omitted for "All projects"); `launch:
// 'external'` tools can't run in a browser (e.g. a desktop app) — the sidebar opens
// their page in a new tab instead of embedding it. MarkerInspector's
// per-photo "analyse this image in X" buttons only render `launch: 'image'`
// tools, so the other kinds appear in the sidebar tool list only.
export interface ToolRef { id: string; name: string; sub: string; url: string; icon: LucideIcon; launch: 'image' | 'rsml' | 'standalone' | 'dataset' | 'external'; imgParam?: string; }

export const TOOLS: ToolRef[] = [
  { id: 'fiji', name: 'FIJI Bench', sub: 'ImageJ · SmartRoot · presets', url: 'https://dr-richard-barker.github.io/cose-fiji/', icon: Microscope, launch: 'image', imgParam: 'open' },
  { id: 'cose-cell-segmenter', name: 'CoSE Cell Segmenter', sub: 'Desktop app · napari + Cellpose', url: 'https://github.com/dr-richard-barker/cose-cell-segmenter#readme', icon: FlaskConical, launch: 'external' },
  { id: 'astroroot', name: 'AstroRoot', sub: 'Root tracing', url: 'https://dr-richard-barker.github.io/astroroot/', icon: Sprout, launch: 'image', imgParam: 'image' },
  { id: 'leaf-pigment-size', name: 'Leaf Pigment & Size', sub: 'Pigment · leaf area', url: 'https://dr-richard-barker.github.io/Anthocyanin-Image-analysis/', icon: FlaskConical, launch: 'image', imgParam: 'image' },
  { id: 'root-traces', name: 'Root Traces', sub: 'RSML viewer', url: ASTROROOT_DASHBOARD_URL, icon: GitBranch, launch: 'rsml' },
  { id: 'germinator-ai', name: 'Germinator AI', sub: 'Seed germination · time-lapse', url: 'https://dr-richard-barker.github.io/germinator-ai/', icon: Timer, launch: 'standalone' },
  { id: 'astroroot-painter', name: 'AstroRoot Painter', sub: 'Train a root model · RootPainter', url: 'https://dr-richard-barker.github.io/astroroot-painter/', icon: Brush, launch: 'dataset' },
];
export const toolById = (id: string) => TOOLS.find(t => t.id === id);

// The iframe src for embedding a tool inside the database shell (embed=1 tells
// the tool to hide its own cross-site CoSE chrome).
// extraParams: optional { scale, unit, preset } for tools that need them (e.g., FIJI bench).
// collection: the collection selected in this database, for launch: 'dataset' tools.
export function toolFrameSrc(t: ToolRef, imageUrl?: string, ref?: string, extraParams?: Record<string, string | number>, collection?: string): string {
  if (t.launch === 'rsml') return rsmlDashboardUrl(ALL_RSML_INDEX_URL, true);
  if (t.launch === 'external') return t.url;
  if (t.launch === 'standalone') return `${t.url}?embed=1`;
  if (t.launch === 'dataset') {
    const q = new URLSearchParams({ embed: '1' });
    if (collection && collection !== ALL) q.set('collection', collection);
    return `${t.url}?${q.toString()}`;
  }
  const q = new URLSearchParams({ embed: '1' });
  if (imageUrl) q.set(t.imgParam!, imageUrl);
  if (ref) q.set('ref', ref);
  // Add any extra parameters (scale, unit, preset, etc.)
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      q.set(key, String(value));
    }
  }
  return `${t.url}?${q.toString()}`;
}

// Build a tool URL that hands off the image plus a stable `ref` (so the tool can
// write its results back to the shared store keyed to this image).
export const toolUrl = (base: string, param: string, imageUrl?: string, ref?: string) => {
  if (!imageUrl) return base;
  const q = new URLSearchParams({ [param]: imageUrl });
  if (ref) q.set('ref', ref);
  return `${base}?${q.toString()}`;
};
