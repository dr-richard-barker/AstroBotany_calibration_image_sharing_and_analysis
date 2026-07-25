import { MinedDatasetItem } from '../types';

export const INITIAL_MINED_DATASETS: MinedDatasetItem[] = [
  {
    id: 'mine-exolab11',
    title: 'ExoLab_11: Spaceflight Legume Growth Time-Lapse Dataset with ABC Marker',
    source: 'NASA OSDR',
    doiOrUrl: 'https://github.com/dr-richard-barker/ExoLab_11',
    imageUrl: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=800&q=80',
    license: 'CC-BY 4.0 International (Dr. Richard Barker)',
    species: 'Trifolium repens (ExoLab-11)',
    confidenceScore: 99.4,
    detectedMarkerBox: { ymin: 10, xmin: 76, ymax: 30, xmax: 92 },
    minedDate: '2026-07-24',
    verifiedByCommunity: true,
    upvotes: 68
  },
  {
    id: 'mine-001',
    title: 'NASA OSDR-388: Spaceflight Microgravity Root Phenotyping Study',
    source: 'NASA OSDR',
    doiOrUrl: 'https://doi.org/10.26030/osdr-388',
    imageUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80',
    license: 'CC0 - Public Domain (NASA)',
    species: 'Arabidopsis thaliana',
    confidenceScore: 98.4,
    detectedMarkerBox: { ymin: 15, xmin: 70, ymax: 35, xmax: 88 },
    minedDate: '2026-06-12',
    verifiedByCommunity: true,
    upvotes: 42
  },
  {
    id: 'mine-002',
    title: 'bioRxiv Preprint: Automated PlantCV AstroCalibration Marker Benchmarking',
    source: 'bioRxiv',
    doiOrUrl: 'https://doi.org/10.1101/2026.05.18.594012',
    imageUrl: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=800&q=80',
    license: 'CC-BY 4.0 International',
    species: 'Brachypodium distachyon',
    confidenceScore: 96.1,
    detectedMarkerBox: { ymin: 10, xmin: 12, ymax: 28, xmax: 30 },
    minedDate: '2026-07-01',
    verifiedByCommunity: true,
    upvotes: 29
  },
  {
    id: 'mine-003',
    title: 'Flickr Botany Open Access Collection: Controlled Environment Canopy',
    source: 'Flickr Research',
    doiOrUrl: 'https://flickr.com/photos/botany_research/529104',
    imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb231fc?auto=format&fit=crop&w=800&q=80',
    license: 'CC-BY-SA 4.0',
    species: 'Solanum lycopersicum',
    confidenceScore: 91.8,
    detectedMarkerBox: { ymin: 48, xmin: 65, ymax: 68, xmax: 82 },
    minedDate: '2026-07-10',
    verifiedByCommunity: true,
    upvotes: 18
  },
  {
    id: 'mine-004',
    title: 'Zenodo Dataset: High-Throughput Anthocyanin Quantification in Stress Trials',
    source: 'Zenodo',
    doiOrUrl: 'https://doi.org/10.5281/zenodo.8920142',
    imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
    license: 'CC-BY 4.0',
    species: 'Oryza sativa',
    confidenceScore: 94.7,
    detectedMarkerBox: { ymin: 8, xmin: 8, ymax: 26, xmax: 24 },
    minedDate: '2026-07-15',
    verifiedByCommunity: false,
    upvotes: 12
  }
];
