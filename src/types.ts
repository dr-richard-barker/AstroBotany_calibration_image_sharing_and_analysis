// Domain model for the AstroBotany Calibration Image Database.
// Every field here is either supplied by a contributor or measured on-device —
// there are no synthetic / AI-invented values.

export interface Pt { x: number; y: number; }

// The four corner ArUco fiducials of the Astrobotany calibration card, ordered
// [TL, TR, BR, BL], in pixel coordinates of the stored (compressed) image.
export type MarkerCorners = [Pt, Pt, Pt, Pt];

// One sampled colour-reference chip after calibration.
export interface ColorChip {
  name: string;
  measured: [number, number, number]; // 0-255, as photographed
  standard: [number, number, number]; // 0-255, Astrobotany reference
}

// Result of running the client-side marker detector over an image.
export interface MarkerAnalysis {
  markerFound: boolean;
  cornersFound: number;         // 0-4, how many fiducials the detector located
  corners: MarkerCorners | null;
  pxPerCm: number | null;       // scale from the 4.3 cm marker span
  pxPerMm: number | null;
  rotationDeg: number | null;
  colorResidualRms: number | null; // affine colour-fit residual (0 = perfect)
  colorChips: ColorChip[];
  detector: 'geometric' | 'aruco' | 'manual';
  analyzedAt: string;           // ISO timestamp
}

// EXIF / device metadata extracted on-device before compression. Values are
// only present when the source photo actually carried them.
export interface CaptureMetadata {
  make?: string;
  model?: string;
  lens?: string;
  dateTimeOriginal?: string;    // ISO, from EXIF DateTimeOriginal
  orientation?: number;
  fNumber?: number;
  exposureTime?: number;
  iso?: number;
  focalLength?: number;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAltitude?: number;
  software?: string;
}

// A stored image record as returned by the API.
export interface ImageRecord {
  id: string;
  title: string;
  species: string | null;
  notes: string | null;
  contributor: string | null;
  source: string;               // 'upload' | 'camera' | 'google-photos' | 'seed'
  sourceRef: string | null;     // e.g. original filename or Google Photos url
  license: string | null;
  tags: string[];

  filename: string;             // stored file, served at /uploads/<filename>
  mime: string;
  width: number;                // stored (compressed) dimensions
  height: number;
  origWidth: number | null;     // dimensions of the phone original
  origHeight: number | null;
  fileSize: number;             // bytes of the stored file
  origFileSize: number | null;  // bytes of the phone original

  capturedAt: string | null;    // ISO, from EXIF if present
  uploadedAt: string;           // ISO, server receipt time

  metadata: CaptureMetadata;
  marker: MarkerAnalysis | null;

  url: string;                  // /uploads/<filename>, filled in client-side
}

export interface DatabaseStats {
  totalImages: number;
  withMarker: number;
  species: number;
  contributors: number;
  totalBytes: number;
  lastUploadAt: string | null;
}

export const IMAGE_URL = (rec: { filename: string }) => `/uploads/${rec.filename}`;
