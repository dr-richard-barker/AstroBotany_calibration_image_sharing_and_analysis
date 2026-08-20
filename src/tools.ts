import { Sprout, FlaskConical, GitBranch, Timer, type LucideIcon } from 'lucide-react';
import { ALL_RSML_INDEX_URL, ASTROROOT_DASHBOARD_URL, rsmlDashboardUrl } from './lib/rsml';

// Sibling CoSE image-analysis tools. `launch: 'image'` tools read `imgParam` to
// auto-load an image passed from this database; `launch: 'rsml'` tools instead
// load the combined RSML root-trace manifest (no per-image launch); `launch:
// 'standalone'` tools take no per-entry handoff at all — they just open
// embedded, for the user to feed their own input (e.g. a whole time-lapse
// series a single database entry can't represent yet). MarkerInspector's
// per-photo "analyse this image in X" buttons only render `launch: 'image'`
// tools, so 'standalone' tools appear in the sidebar tool list only.
export interface ToolRef { id: string; name: string; sub: string; url: string; icon: LucideIcon; launch: 'image' | 'rsml' | 'standalone'; imgParam?: string; }

export const TOOLS: ToolRef[] = [
  { id: 'astroroot', name: 'AstroRoot', sub: 'Root tracing', url: 'https://dr-richard-barker.github.io/astroroot/', icon: Sprout, launch: 'image', imgParam: 'image' },
  { id: 'leaf-pigment-size', name: 'Leaf Pigment & Size', sub: 'Pigment · leaf area', url: 'https://dr-richard-barker.github.io/Anthocyanin-Image-analysis/', icon: FlaskConical, launch: 'image', imgParam: 'image' },
  { id: 'root-traces', name: 'Root Traces', sub: 'RSML viewer', url: ASTROROOT_DASHBOARD_URL, icon: GitBranch, launch: 'rsml' },
  { id: 'germinator-ai', name: 'Germinator AI', sub: 'Seed germination · time-lapse', url: 'https://dr-richard-barker.github.io/germinator-ai/', icon: Timer, launch: 'standalone' },
];
export const toolById = (id: string) => TOOLS.find(t => t.id === id);

// The iframe src for embedding a tool inside the database shell (embed=1 tells
// the tool to hide its own cross-site CoSE chrome).
export function toolFrameSrc(t: ToolRef, imageUrl?: string, ref?: string): string {
  if (t.launch === 'rsml') return rsmlDashboardUrl(ALL_RSML_INDEX_URL, true);
  if (t.launch === 'standalone') return `${t.url}?embed=1`;
  const q = new URLSearchParams({ embed: '1' });
  if (imageUrl) q.set(t.imgParam!, imageUrl);
  if (ref) q.set('ref', ref);
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
