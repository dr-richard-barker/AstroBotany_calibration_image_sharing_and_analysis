import { Sprout, FlaskConical, type LucideIcon } from 'lucide-react';

// Sibling CoSE image-analysis tools (open in a new tab). `imgParam` is the query
// key each tool reads to auto-load an image passed from this database.
export interface ToolRef { name: string; sub: string; url: string; icon: LucideIcon; imgParam: string; }

export const TOOLS: ToolRef[] = [
  { name: 'AstroRoot', sub: 'Root tracing', url: 'https://dr-richard-barker.github.io/astroroot/', icon: Sprout, imgParam: 'image' },
  { name: 'Anthocyanin', sub: 'Colour analysis', url: 'https://dr-richard-barker.github.io/Anthocyanin-Image-analysis/', icon: FlaskConical, imgParam: 'image' },
];

export const toolUrl = (base: string, param: string, imageUrl?: string) =>
  imageUrl ? `${base}?${param}=${encodeURIComponent(imageUrl)}` : base;
