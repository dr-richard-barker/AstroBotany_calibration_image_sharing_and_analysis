// Seed the database with real, openly-licensed starter images so a fresh
// instance isn't empty. Every entry below points at an actual file in
// public/seed/ recycled from Richard Barker's own repositories — no stock
// photos, no fabricated records. Marker analysis is intentionally left null:
// run "Detect marker" in the inspector (browser-side CV) to populate it.

import path from 'node:path';
import fs from 'node:fs';
import { db, storeImage, imageSize, ROOT, type Row } from '../db.ts';

interface Seed {
  file: string;
  title: string;
  species: string | null;
  notes: string;
  license: string;
  sourceRef: string;
  tags: string[];
}

const SEEDS: Seed[] = [
  {
    file: 'aruco_markers_demo.png',
    title: 'ArUco marker target (calibration reference)',
    species: null,
    notes: 'Reference image of the ArUco fiducial target used by the Astrobotany calibration card. Use the ArUco-decoder option in the inspector to read it.',
    license: 'MIT (Richard Barker)',
    sourceRef: 'github.com/dr-richard-barker/Anthocyanin-Image-analysis',
    tags: ['calibration', 'aruco', 'reference'],
  },
  {
    file: 'medicago_marker.jpg',
    title: 'Medicago truncatula beside Astrobotany calibration card',
    species: 'Medicago truncatula',
    notes: 'Legume seedling photographed next to the Astrobotany colour + scale marker card.',
    license: 'CC-BY 4.0 (Richard Barker)',
    sourceRef: 'github.com/dr-richard-barker/Anthocyanin-Image-analysis',
    tags: ['legume', 'calibration', 'colour-card'],
  },
  {
    file: 'fastplants_colour.jpg',
    title: 'Fast Plants specimen with colour calibration reference',
    species: 'Brassica rapa (Wisconsin Fast Plants)',
    notes: 'Brassica rapa photographed with the colour calibration reference for anthocyanin quantification.',
    license: 'CC-BY 4.0 (Richard Barker)',
    sourceRef: 'github.com/dr-richard-barker/Anthocyanin-Image-analysis',
    tags: ['fast-plants', 'anthocyanin', 'colour-card'],
  },
  {
    file: 'apex03_FLT_Col0_304.jpg',
    title: 'APEX-03 spaceflight Arabidopsis root scan (Col-0, FLT 304)',
    species: 'Arabidopsis thaliana (Col-0)',
    notes: 'Flight sample root scan from the APEX-03 spaceflight experiment.',
    license: 'CC-BY 4.0 (Richard Barker)',
    sourceRef: 'github.com/dr-richard-barker/astroroot',
    tags: ['spaceflight', 'APEX-03', 'roots', 'flight'],
  },
  {
    file: 'apex03_GC_Col0_404.jpg',
    title: 'APEX-03 ground-control Arabidopsis root scan (Col-0, GC 404)',
    species: 'Arabidopsis thaliana (Col-0)',
    notes: 'Ground-control root scan paired with the APEX-03 flight samples.',
    license: 'CC-BY 4.0 (Richard Barker)',
    sourceRef: 'github.com/dr-richard-barker/astroroot',
    tags: ['spaceflight', 'APEX-03', 'roots', 'ground-control'],
  },
];

const SEED_DIR = path.join(ROOT, 'public', 'seed');
const existing = new Set(
  (db.prepare("SELECT source_ref, title FROM images WHERE source = 'seed'").all() as Row[]).map(r => r.title),
);

let added = 0;
for (const s of SEEDS) {
  if (existing.has(s.title)) { console.log(`· skip (already seeded): ${s.title}`); continue; }
  const full = path.join(SEED_DIR, s.file);
  if (!fs.existsSync(full)) { console.warn(`! missing seed file: ${s.file}`); continue; }
  const buffer = fs.readFileSync(full);
  const dims = imageSize(buffer);
  const mime = s.file.endsWith('.png') ? 'image/png' : 'image/jpeg';
  storeImage({
    buffer, mime,
    title: s.title, species: s.species, notes: s.notes, contributor: 'Richard Barker',
    source: 'seed', sourceRef: s.sourceRef, license: s.license, tags: s.tags,
    width: dims?.[0] || 0, height: dims?.[1] || 0,
    origWidth: dims?.[0] || null, origHeight: dims?.[1] || null, origFileSize: buffer.length,
    capturedAt: null, metadata: {}, marker: null,
  });
  console.log(`+ seeded: ${s.title}`);
  added++;
}
console.log(`\nDone. ${added} image(s) added.`);
