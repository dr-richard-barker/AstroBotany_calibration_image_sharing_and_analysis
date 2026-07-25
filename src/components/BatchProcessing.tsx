import React, { useState } from 'react';
import { BatchJobItem } from '../types';
import { Layers, Play, CheckCircle, Clock, FileJson, FileSpreadsheet, Download, RefreshCw, AlertCircle } from 'lucide-react';

interface BatchProcessingProps {
  initialJobs: BatchJobItem[];
}

export const BatchProcessing: React.FC<BatchProcessingProps> = ({ initialJobs }) => {
  const [jobs, setJobs] = useState<BatchJobItem[]>(initialJobs);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv' | 'plantcv'>('json');

  const runBatchProcessing = async () => {
    setIsProcessingBatch(true);

    for (let i = 0; i < jobs.length; i++) {
      if (jobs[i].status === 'completed') continue;

      // Update item to processing
      setJobs((prev) =>
        prev.map((j, idx) => (idx === i ? { ...j, status: 'processing' } : j))
      );

      // Simulate API analysis delay per item
      await new Promise((resolve) => setTimeout(resolve, 600));

      setJobs((prev) =>
        prev.map((j, idx) =>
          idx === i
            ? {
                ...j,
                status: 'completed',
                result: {
                  id: `det-batch-${Date.now()}-${i}`,
                  markerFound: true,
                  confidence: Math.round((92 + Math.random() * 7) * 10) / 10,
                  boundingBox: { ymin: 14, xmin: 68, ymax: 34, xmax: 88 },
                  markerType: 'astrocalibration_v2_grid',
                  pixelPerMmRatio: Math.round((13.5 + Math.random() * 2) * 10) / 10,
                  rotationAngleDeg: Math.round(Math.random() * 5 * 10) / 10,
                  lightingQuality: 'optimal',
                  occlusionPercentage: Math.floor(Math.random() * 10),
                  colorCalibration: [],
                  detectedAt: new Date().toISOString(),
                },
                plantMetrics: {
                  root: {
                    primaryRootLengthMm: Math.round((28 + Math.random() * 15) * 10) / 10,
                    totalRootAreaMm2: Math.round((65 + Math.random() * 30) * 10) / 10,
                    lateralRootCount: Math.floor(8 + Math.random() * 12),
                    rootBranchingDensity: 0.38,
                    averageRootDiameterMm: 0.62,
                  },
                  anthocyanin: {
                    anthocyaninIndexPercent: Math.round((25 + Math.random() * 20) * 10) / 10,
                    calibratedRgbMean: [138, 72, 102],
                    hsvHueAngle: 330,
                    stressFactorScore: Math.round((3 + Math.random() * 3) * 10) / 10,
                  },
                },
              }
            : j
        )
      );
    }

    setIsProcessingBatch(false);
  };

  const completedCount = jobs.filter((j) => j.status === 'completed').length;
  const progressPercent = Math.round((completedCount / jobs.length) * 100);

  const exportBatchManifest = () => {
    let content = '';
    let mimeType = 'application/json';
    let filename = `astrobotany_batch_annotations.${selectedFormat}`;

    if (selectedFormat === 'json') {
      content = JSON.stringify(jobs, null, 2);
    } else if (selectedFormat === 'csv') {
      mimeType = 'text/csv';
      content = 'FileName,MarkerFound,Confidence,PxPerMm,PrimaryRootLengthMm,AnthocyaninIndexPercent\n';
      jobs.forEach((j) => {
        content += `"${j.fileName}",${j.result?.markerFound || false},${j.result?.confidence || 0},${j.result?.pixelPerMmRatio || 0},${j.plantMetrics?.root?.primaryRootLengthMm || 0},${j.plantMetrics?.anthocyanin?.anthocyaninIndexPercent || 0}\n`;
      });
    } else {
      mimeType = 'text/plain';
      content = `# PlantCV Batch Runner Manifest
# AstroBotany Scale Factor Directory
`;
      jobs.forEach((j) => {
        content += `image: "${j.fileName}" -> px_per_mm = ${j.result?.pixelPerMmRatio || 14.0} (confidence: ${j.result?.confidence || 0}%)\n`;
      });
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs mb-1">
              <Layers className="w-4 h-4" />
              <span>HIGH-THROUGHPUT BATCH ANNOTATION</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              Batch Dataset Image Processing Pipeline
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Process hundreds of plant research images automatically to detect AstroBotany calibration markers, compute scale ratios (px/mm), and output PlantCV-compatible JSON/CSV manifests.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={runBatchProcessing}
              disabled={isProcessingBatch || completedCount === jobs.length}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-md shadow-emerald-900/30 transition-all"
            >
              {isProcessingBatch ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>{isProcessingBatch ? 'Processing Batch...' : 'Run Batch Analysis'}</span>
            </button>

            <button
              onClick={exportBatchManifest}
              disabled={completedCount === 0}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export Batch Manifest</span>
            </button>
          </div>
        </div>

        {/* Batch Progress Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">
              Batch Queue: {completedCount} / {jobs.length} Completed ({progressPercent}%)
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">Format:</span>
              <button
                onClick={() => setSelectedFormat('json')}
                className={`px-2 py-0.5 rounded text-[11px] ${
                  selectedFormat === 'json' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
                }`}
              >
                JSON
              </button>
              <button
                onClick={() => setSelectedFormat('csv')}
                className={`px-2 py-0.5 rounded text-[11px] ${
                  selectedFormat === 'csv' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
                }`}
              >
                CSV
              </button>
              <button
                onClick={() => setSelectedFormat('plantcv')}
                className={`px-2 py-0.5 rounded text-[11px] ${
                  selectedFormat === 'plantcv' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
                }`}
              >
                PlantCV
              </button>
            </div>
          </div>

          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-200">Dataset Batch File Items</h3>
          <span className="text-xs text-slate-500 font-mono">Total {jobs.length} Images</span>
        </div>

        <div className="divide-y divide-slate-800/80 text-xs">
          {jobs.map((job) => (
            <div key={job.id} className="p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
              <div className="flex items-center space-x-3">
                <img src={job.previewUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-800" />
                <div>
                  <h4 className="font-semibold text-slate-200">{job.fileName}</h4>
                  <span className="text-[11px] text-slate-500 font-mono">{job.fileSize}</span>
                </div>
              </div>

              {/* Status & Metrics */}
              <div className="flex items-center space-x-6">
                {job.status === 'completed' && job.result && (
                  <div className="hidden md:flex items-center space-x-4 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[9px]">Scale Ratio</span>
                      <span className="text-emerald-400 font-bold">{job.result.pixelPerMmRatio} px/mm</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[9px]">AstroRoot Length</span>
                      <span className="text-cyan-400 font-bold">{job.plantMetrics?.root?.primaryRootLengthMm} mm</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[9px]">Anthocyanin Index</span>
                      <span className="text-purple-400 font-bold">{job.plantMetrics?.anthocyanin?.anthocyaninIndexPercent}%</span>
                    </div>
                  </div>
                )}

                <div>
                  {job.status === 'completed' && (
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-semibold text-[10px] inline-flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Processed</span>
                    </span>
                  )}

                  {job.status === 'processing' && (
                    <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full font-semibold text-[10px] inline-flex items-center space-x-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Detecting...</span>
                    </span>
                  )}

                  {job.status === 'queued' && (
                    <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full font-semibold text-[10px] inline-flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Queued</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
