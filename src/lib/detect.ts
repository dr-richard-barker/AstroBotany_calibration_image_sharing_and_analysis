// Thin adapter over the recycled colorcalib engine: run the client-side ArUco /
// geometric fiducial detector on an ImageData and shape the result into the
// MarkerAnalysis stored in the database. All measurement, no AI.

import {
  detectMarkerCorners, scaleAndRotation, fitFromQuad, orderCorners, classifyCardByAspect,
  CARDS, MARKER_SPAN_CM, type Pt, type CardVersion,
} from './colorcalib';
import type { MarkerAnalysis, MarkerCorners, ColorChip } from '../types';

function to255(rgb01: number[]): [number, number, number] {
  return [Math.round(rgb01[0] * 255), Math.round(rgb01[1] * 255), Math.round(rgb01[2] * 255)];
}

// Scale + colour for a known card. v1 keeps its fixed 6 px sampling radius; v2
// samples a patch ~1/4 of the chip edge so it stays inside the chip at any scale.
function measure(data: Uint8ClampedArray, w: number, h: number, corners: Pt[], card: CardVersion) {
  const spec = CARDS[card];
  const { pxPerCm, rotationDeg } = scaleAndRotation(corners, spec.spanCm);
  const radius = spec.chipCm ? Math.max(2, Math.min(25, Math.round(pxPerCm * spec.chipCm * 0.25))) : 6;
  const fit = fitFromQuad(data, w, h, corners, spec.chips, radius);
  const colorChips: ColorChip[] = spec.chips.map((chip, i) => ({
    name: chip.name,
    measured: to255(fit.source[i]),
    standard: to255(chip.std),
  }));
  return { pxPerCm, rotationDeg, fit, colorChips };
}

// Detect the calibration marker in an ImageData and derive scale + colour metrics.
export async function analyzeMarker(
  img: ImageData,
  opts: { skipGeometric?: boolean } = {},
): Promise<MarkerAnalysis> {
  const now = new Date().toISOString();
  const { data, width: w, height: h } = img;

  const { corners, found, verified, card: detectedCard } = await detectMarkerCorners(data, w, h, opts);
  if (!corners) {
    return {
      markerFound: false, cornersFound: found, corners: null,
      pxPerCm: null, pxPerMm: null, rotationDeg: null,
      colorResidualRms: null, colorChips: [],
      detector: opts.skipGeometric ? 'aruco' : 'geometric', analyzedAt: now,
    };
  }

  const card = detectedCard ?? 'v1';
  const { pxPerCm, rotationDeg, fit, colorChips } = measure(data, w, h, corners, card);

  return {
    markerFound: true,
    cornersFound: found,
    card,
    markersVerified: verified ?? 0,
    corners: cornersToTuple(corners),
    pxPerCm: round(pxPerCm, 2),
    pxPerMm: round(pxPerCm / 10, 3),
    rotationDeg: round(rotationDeg, 2),
    colorResidualRms: round(fit.residual, 4),
    colorChips,
    detector: opts.skipGeometric ? 'aruco' : 'geometric',
    analyzedAt: now,
  };
}

// Recompute scale/colour from a user-adjusted 4-corner quad (manual annotation).
// `card` is the card from an earlier detection; without one it is guessed from
// the quad's aspect ratio.
export function analyzeFromQuad(img: ImageData, quad: MarkerCorners, card?: CardVersion): MarkerAnalysis {
  const now = new Date().toISOString();
  const ordered = orderCorners(quad.map(p => ({ x: p.x, y: p.y })));
  const c = card ?? classifyCardByAspect(ordered);
  const { pxPerCm, rotationDeg, fit, colorChips } = measure(img.data, img.width, img.height, ordered, c);
  return {
    markerFound: true, cornersFound: 4, card: c, markersVerified: 0, corners: cornersToTuple(ordered),
    pxPerCm: round(pxPerCm, 2), pxPerMm: round(pxPerCm / 10, 3), rotationDeg: round(rotationDeg, 2),
    colorResidualRms: round(fit.residual, 4), colorChips, detector: 'manual', analyzedAt: now,
  };
}

function cornersToTuple(pts: Pt[]): MarkerCorners {
  const p = pts.map(q => ({ x: round(q.x, 1), y: round(q.y, 1) }));
  return [p[0], p[1], p[2], p[3]] as MarkerCorners;
}
function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export { MARKER_SPAN_CM };
