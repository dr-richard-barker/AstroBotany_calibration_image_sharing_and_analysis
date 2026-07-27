import { Sprout, FlaskConical, type LucideIcon } from 'lucide-react';

// Sibling CoSE image-analysis tools (open in a new tab). `imgParam` is the query
// key each tool reads to auto-load an image passed from this database.
export interface ToolRef { name: string; sub: string; url: string; icon: LucideIcon; imgParam: string; }

export const TOOLS: ToolRef[] = [
  { name: 'AstroRoot', sub: 'Root tracing', url: 'https://dr-richard-barker.github.io/astroroot/', icon: Sprout, imgParam: 'image' },
  { name: 'Leaf Pigment & Size', sub: 'Pigment · leaf area', url: 'https://dr-richard-barker.github.io/Anthocyanin-Image-analysis/', icon: FlaskConical, imgParam: 'image' },
];

// Build a tool URL that hands off the image plus a stable `ref` (so the tool can
// write its results back to the shared store keyed to this image).
export const toolUrl = (base: string, param: string, imageUrl?: string, ref?: string) => {
  if (!imageUrl) return base;
  const q = new URLSearchParams({ [param]: imageUrl });
  if (ref) q.set('ref', ref);
  return `${base}?${q.toString()}`;
};
