export interface AstroMarkerBoundingBox {
  ymin: number; // 0-100% or 0-1 normalized
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface ColorTargetPatch {
  name: string;
  expectedHex: string;
  measuredHex: string;
  deltaE: number;
}

export interface MarkerDetectionResult {
  id: string;
  markerFound: boolean;
  confidence: number; // 0 - 100
  boundingBox?: AstroMarkerBoundingBox;
  markerType: 'astrocalibration_v1' | 'astrocalibration_v2_grid' | 'standard_checkerboard' | 'custom_botanical';
  pixelPerMmRatio: number; // e.g. 12.5 px/mm
  rotationAngleDeg: number;
  lightingQuality: 'optimal' | 'shadowed' | 'overexposed' | 'uneven' | 'glare';
  occlusionPercentage: number; // 0-100
  colorCalibration: ColorTargetPatch[];
  embeddingVector?: number[];
  similarityScore?: number;
  detectedAt: string;
}

export interface GroundTruthImage {
  id: string;
  title: string;
  species: string;
  category: 'positive' | 'negative';
  imageUrl: string;
  thumbnailUrl?: string;
  description: string;
  lightingCondition: string;
  angle: string;
  occluded: boolean;
  boundingBox?: AstroMarkerBoundingBox;
  pixelPerMm: number;
  experimentId: string;
  tags: string[];
}

export interface PlantCVAnnotation {
  imageId: string;
  marker: {
    present: boolean;
    centerPx: [number, number];
    scaleFactorPxPerMm: number;
    colorCardMatrix?: string;
  };
  plantcvVersion: string;
  codeSnippet: string;
}

export interface AstroRootMetrics {
  primaryRootLengthMm: number;
  totalRootAreaMm2: number;
  lateralRootCount: number;
  rootBranchingDensity: number; // per mm
  averageRootDiameterMm: number;
}

export interface AnthocyaninMetrics {
  anthocyaninIndexPercent: number; // 0-100%
  calibratedRgbMean: [number, number, number];
  hsvHueAngle: number;
  stressFactorScore: number; // 0-10
}

export interface MinedDatasetItem {
  id: string;
  title: string;
  source: 'NASA OSDR' | 'bioRxiv' | 'Flickr Research' | 'Zenodo' | 'Hugging Face';
  doiOrUrl: string;
  imageUrl: string;
  license: string;
  species: string;
  confidenceScore: number;
  detectedMarkerBox: AstroMarkerBoundingBox;
  minedDate: string;
  verifiedByCommunity: boolean;
  upvotes: number;
}

export interface BatchJobItem {
  id: string;
  fileName: string;
  fileSize: string;
  previewUrl: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result?: MarkerDetectionResult;
  plantMetrics?: {
    root?: AstroRootMetrics;
    anthocyanin?: AnthocyaninMetrics;
  };
}

export interface ExoLabFrame {
  frameId: string;
  flightDay: number; // e.g. 1 to 14
  timestampIso: string;
  imageUrl: string;
  species: string;
  markerFound: boolean;
  confidence: number;
  pixelPerMm: number;
  boundingBox: AstroMarkerBoundingBox;
  canopyAreaMm2: number;
  anthocyaninIndex: number; // %
  rootLengthMm: number;
  chamberTempC: number;
  humidityPercent: number;
}

