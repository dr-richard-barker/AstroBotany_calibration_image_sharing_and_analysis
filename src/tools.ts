import { Sprout, FlaskConical, type LucideIcon } from 'lucide-react';

// Sibling CoSE image-analysis tools (open in a new tab). `imgParam` is the query
// key each tool reads to auto-load an image passed from this database.
export interface ToolRef { id: string; name: string; sub: string; url: string; icon: LucideIcon; imgParam: string; }

export const TOOLS: ToolRef[] = [
  { id: 'astroroot', name: 'AstroRoot', sub: 'Root tracing', url: 'https://dr-richard-barker.github.io/astroroot/', icon: Sprout, imgParam: 'image' },
  { id: 'leaf-pigment-size', name: 'Leaf Pigment & Size', sub: 'Pigment · leaf area', url: 'https://dr-richard-barker.github.io/Anthocyanin-Image-analysis/', icon: FlaskConical, imgParam: 'image' },
];
export const toolById = (id: string) => TOOLS.find(t => t.id === id);

// The iframe src for embedding a tool inside the database shell (embed=1 tells
// the tool to hide its own cross-site CoSE chrome).
export function toolFrameSrc(t: ToolRef, imageUrl?: string, ref?: string): string {
  const q = new URLSearchParams({ embed: '1' });
  if (imageUrl) q.set(t.imgParam, imageUrl);
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
