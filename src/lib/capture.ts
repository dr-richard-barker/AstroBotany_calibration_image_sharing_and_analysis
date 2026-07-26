// Phone-photo ingestion pipeline (fully client-side):
//   1. read EXIF / device metadata from the ORIGINAL file (before it is re-encoded)
//   2. down-scale to a database-friendly resolution and re-encode as JPEG at a
//      target quality, honouring the EXIF orientation flag
//   3. hand back the compressed Blob + a preview URL + the extracted metadata
//
// Nothing here contacts a network or an AI service.

import exifr from 'exifr';
import type { CaptureMetadata } from '../types';

export interface PreparedImage {
  blob: Blob;
  previewUrl: string;      // object URL for the compressed image
  width: number;           // compressed dimensions
  height: number;
  origWidth: number;
  origHeight: number;
  fileSize: number;        // compressed byte size
  origFileSize: number;    // original byte size
  metadata: CaptureMetadata;
  capturedAt: string | null;
}

export interface CompressOptions {
  maxEdge?: number;        // longest side of the stored image, px
  quality?: number;        // JPEG quality 0-1
}

const DEFAULTS: Required<CompressOptions> = { maxEdge: 2048, quality: 0.82 };

// Pull the EXIF fields we care about. exifr silently returns undefined per-field
// when a photo doesn't carry them (Google-processed images often drop most).
export async function readMetadata(file: Blob): Promise<{ metadata: CaptureMetadata; capturedAt: string | null }> {
  let raw: any = null;
  try {
    raw = await exifr.parse(file, {
      tiff: true, exif: true, gps: true,
      pick: [
        'Make', 'Model', 'LensModel', 'DateTimeOriginal', 'CreateDate', 'Orientation',
        'FNumber', 'ExposureTime', 'ISO', 'ISOSpeedRatings', 'FocalLength', 'Software',
        'GPSLatitude', 'GPSLongitude', 'GPSAltitude', 'latitude', 'longitude',
      ],
    });
  } catch {
    raw = null;
  }
  const md: CaptureMetadata = {};
  if (raw) {
    if (raw.Make) md.make = String(raw.Make).trim();
    if (raw.Model) md.model = String(raw.Model).trim();
    if (raw.LensModel) md.lens = String(raw.LensModel).trim();
    if (raw.Orientation != null) md.orientation = Number(raw.Orientation);
    if (raw.FNumber != null) md.fNumber = Number(raw.FNumber);
    if (raw.ExposureTime != null) md.exposureTime = Number(raw.ExposureTime);
    const iso = raw.ISO ?? raw.ISOSpeedRatings;
    if (iso != null) md.iso = Array.isArray(iso) ? Number(iso[0]) : Number(iso);
    if (raw.FocalLength != null) md.focalLength = Number(raw.FocalLength);
    if (raw.Software) md.software = String(raw.Software).trim();
    // exifr computes decimal latitude/longitude on `latitude`/`longitude`.
    if (typeof raw.latitude === 'number') md.gpsLatitude = raw.latitude;
    if (typeof raw.longitude === 'number') md.gpsLongitude = raw.longitude;
    if (raw.GPSAltitude != null) md.gpsAltitude = Number(raw.GPSAltitude);
  }
  const dt: Date | string | undefined = raw?.DateTimeOriginal ?? raw?.CreateDate;
  let capturedAt: string | null = null;
  if (dt instanceof Date && !isNaN(dt.getTime())) capturedAt = dt.toISOString();
  else if (typeof dt === 'string' && dt) capturedAt = dt;
  if (capturedAt) md.dateTimeOriginal = capturedAt;
  return { metadata: md, capturedAt };
}

// Decode a Blob into an ImageBitmap, respecting EXIF orientation when the
// browser supports imageOrientation (all evergreen browsers do).
async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    // Safari < 16 fallback: decode via <img> (orientation already applied by the
    // browser for object URLs of EXIF-tagged JPEGs).
    return await new Promise<ImageBitmap>((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = async () => {
        try { resolve(await createImageBitmap(img)); }
        catch (e) { reject(e); }
        finally { URL.revokeObjectURL(url); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image decode failed')); };
      img.src = url;
    });
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('canvas encode failed'))), type, quality);
  });
}

// Full pipeline: metadata + compressed JPEG.
export async function prepareImage(file: File, opts: CompressOptions = {}): Promise<PreparedImage> {
  const { maxEdge, quality } = { ...DEFAULTS, ...opts };
  const { metadata, capturedAt } = await readMetadata(file);

  const bmp = await decode(file);
  const origWidth = bmp.width, origHeight = bmp.height;
  const scale = Math.min(1, maxEdge / Math.max(origWidth, origHeight));
  const width = Math.max(1, Math.round(origWidth * scale));
  const height = Math.max(1, Math.round(origHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, width, height);
  bmp.close?.();

  const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    width, height,
    origWidth, origHeight,
    fileSize: blob.size,
    origFileSize: file.size,
    metadata, capturedAt,
  };
}

// Get raw RGBA pixels of a Blob for the marker detector (kept full-res-ish but
// capped so detection stays fast on large photos).
export async function toImageData(blob: Blob, maxEdge = 1400): Promise<ImageData> {
  const bmp = await decode(blob);
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return ctx.getImageData(0, 0, w, h);
}

export function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
