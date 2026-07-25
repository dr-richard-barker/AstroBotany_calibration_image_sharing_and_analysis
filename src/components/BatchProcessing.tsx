import React, { useState } from 'react';
import { BatchJobItem } from '../types';
import {
  Layers,
  Play,
  CheckCircle,
  Clock,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Copy,
  Check,
  Table,
  BarChart2,
  Sliders,
  FileText,
  Sparkles,
  Database
} from 'lucide-react';

interface BatchProcessingProps {
  initialJobs: BatchJobItem[];
}

export const BatchProcessing: React.FC<BatchProcessingProps> = ({ initialJobs }) => {
  const [jobs, setJobs] = useState<BatchJobItem[]>(initialJobs);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv' | 'plantcv'>('csv');
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);
  const [csvDelimiter, setCsvDelimiter] = useState<',' | ';' | '\t'>(',');
  const [includeBoundingBox, setIncludeBoundingBox] = useState<boolean>(true);
  const [includeRgbData, setIncludeRgbData] = useState<boolean>(true);
  const [showRawCsvPreview, setShowRawCsvPreview] = useState<boolean>(false);

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

  // Compute summary stats across completed jobs
  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const avgPxPerMm = completedJobs.length
    ? (completedJobs.reduce((acc, curr) => acc + (curr.result?.pixelPerMmRatio || 0), 0) / completedJobs.length).toFixed(2)
    : '0.00';
  const avgPrimaryRootMm = completedJobs.length
    ? (completedJobs.reduce((acc, curr) => acc + (curr.plantMetrics?.root?.primaryRootLengthMm || 0), 0) / completedJobs.length).toFixed(1)
    : '0.0';
  const avgAnthocyaninPct = completedJobs.length
    ? (completedJobs.reduce((acc, curr) => acc + (curr.plantMetrics?.anthocyanin?.anthocyaninIndexPercent || 0), 0) / completedJobs.length).toFixed(1)
    : '0.0';
  const avgStressScore = completedJobs.length
    ? (completedJobs.reduce((acc, curr) => acc + (curr.plantMetrics?.anthocyanin?.stressFactorScore || 0), 0) / completedJobs.length).toFixed(1)
    : '0.0';

  // Build Consolidated CSV Content string
  const generateConsolidatedCsvContent = (): string => {
    const delim = csvDelimiter;
    const headers = [
      'Job_ID',
      'File_Name',
      'Status',
      'Marker_Found',
      'Detection_Confidence_Pct',
      'Pixel_Per_Mm_Scale',
      'Primary_Root_Length_Mm',
      'Total_Root_Area_Mm2',
      'Lateral_Root_Count',
      'Anthocyanin_Index_Pct',
      'Stress_Factor_Score_0to10',
    ];

    if (includeRgbData) {
      headers.push('Calibrated_RGB_Red', 'Calibrated_RGB_Green', 'Calibrated_RGB_Blue', 'HSV_Hue_Angle');
    }

    if (includeBoundingBox) {
      headers.push('BBox_YMin_Pct', 'BBox_XMin_Pct', 'BBox_YMax_Pct', 'BBox_XMax_Pct');
    }

    headers.push('Processed_At');

    let rows = headers.join(delim) + '\n';

    jobs.forEach((j) => {
      const rowVals: (string | number)[] = [
        j.id,
        `"${j.fileName}"`,
        j.status,
        j.result?.markerFound ? 'TRUE' : 'FALSE',
        j.result?.confidence || 0,
        j.result?.pixelPerMmRatio || 0,
        j.plantMetrics?.root?.primaryRootLengthMm || 0,
        j.plantMetrics?.root?.totalRootAreaMm2 || 0,
        j.plantMetrics?.root?.lateralRootCount || 0,
        j.plantMetrics?.anthocyanin?.anthocyaninIndexPercent || 0,
        j.plantMetrics?.anthocyanin?.stressFactorScore || 0,
      ];

      if (includeRgbData) {
        const rgb = j.plantMetrics?.anthocyanin?.calibratedRgbMean || [0, 0, 0];
        rowVals.push(rgb[0], rgb[1], rgb[2], j.plantMetrics?.anthocyanin?.hsvHueAngle || 0);
      }

      if (includeBoundingBox) {
        const bbox = j.result?.boundingBox;
        rowVals.push(
          bbox ? bbox.ymin : 0,
          bbox ? bbox.xmin : 0,
          bbox ? bbox.ymax : 0,
          bbox ? bbox.xmax : 0
        );
      }

      rowVals.push(`"${j.result?.detectedAt || new Date().toISOString()}"`);

      rows += rowVals.join(delim) + '\n';
    });

    return rows;
  };

  const handleDownloadConsolidatedCsv = () => {
    const csvData = generateConsolidatedCsvContent();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `astrobotany_consolidated_batch_dataset_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleCopyCsvToClipboard = () => {
    const csvData = generateConsolidatedCsvContent();
    navigator.clipboard.writeText(csvData);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  const exportBatchManifest = () => {
    let content = '';
    let mimeType = 'application/json';
    let filename = `astrobotany_batch_annotations.${selectedFormat}`;

    if (selectedFormat === 'json') {
      content = JSON.stringify(jobs, null, 2);
    } else if (selectedFormat === 'csv') {
      content = generateConsolidatedCsvContent();
      mimeType = 'text/csv';
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
              onClick={handleDownloadConsolidatedCsv}
              disabled={completedCount === 0}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export Consolidated CSV</span>
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
                onClick={() => setSelectedFormat('csv')}
                className={`px-2 py-0.5 rounded text-[11px] ${
                  selectedFormat === 'csv' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
                }`}
              >
                CSV
              </button>
              <button
                onClick={() => setSelectedFormat('json')}
                className={`px-2 py-0.5 rounded text-[11px] ${
                  selectedFormat === 'json' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
                }`}
              >
                JSON
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

      {/* NEW SECTION: CONSOLIDATED CSV DATA EXPORT & ANALYTICS CENTER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 shadow-xl relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-base text-slate-100">
                Consolidated Batch Dataset CSV Export & Analytics
              </h3>
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                CSV Export Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Export all processed job results into a unified CSV matrix with scale ratios (px/mm), AstroRoot length metrics, and anthocyanin stress indices for R, Python, and Excel data pipelines.
            </p>
          </div>

          {/* Direct CSV Action Buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleCopyCsvToClipboard}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              {copiedCsv ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">CSV Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copy CSV</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadConsolidatedCsv}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-md shadow-emerald-900/30 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Consolidated CSV</span>
            </button>
          </div>
        </div>

        {/* Aggregate Summary Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Processed Jobs</span>
            <span className="text-emerald-400 font-bold text-sm">{completedJobs.length} / {jobs.length}</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Mean Scale Factor</span>
            <span className="text-cyan-400 font-bold text-sm">{avgPxPerMm} <span className="text-[10px] font-normal text-slate-400">px/mm</span></span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Mean Primary Root</span>
            <span className="text-teal-300 font-bold text-sm">{avgPrimaryRootMm} <span className="text-[10px] font-normal text-slate-400">mm</span></span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Mean Anthocyanin</span>
            <span className="text-purple-400 font-bold text-sm">{avgAnthocyaninPct}%</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 col-span-2 md:col-span-1">
            <span className="text-slate-500 text-[10px] block">Avg Stress Score</span>
            <span className="text-amber-400 font-bold text-sm">{avgStressScore} <span className="text-[10px] font-normal text-slate-400">/ 10</span></span>
          </div>
        </div>

        {/* CSV Export Configuration Controls */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV Format & Field Customization Options</span>
            </span>

            <button
              onClick={() => setShowRawCsvPreview(!showRawCsvPreview)}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-mono"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showRawCsvPreview ? 'Hide Raw CSV Code' : 'View Raw CSV Code'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono">
            {/* Delimiter Radio Selector */}
            <div className="flex items-center space-x-3">
              <span className="text-slate-400">Delimiter:</span>
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="radio"
                  name="delimiter"
                  checked={csvDelimiter === ','}
                  onChange={() => setCsvDelimiter(',')}
                  className="accent-emerald-500"
                />
                <span className="text-slate-300">Comma ( , )</span>
              </label>

              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="radio"
                  name="delimiter"
                  checked={csvDelimiter === ';'}
                  onChange={() => setCsvDelimiter(';')}
                  className="accent-emerald-500"
                />
                <span className="text-slate-300">Semicolon ( ; )</span>
              </label>

              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="radio"
                  name="delimiter"
                  checked={csvDelimiter === '\t'}
                  onChange={() => setCsvDelimiter('\t')}
                  className="accent-emerald-500"
                />
                <span className="text-slate-300">Tab ( \t )</span>
              </label>
            </div>

            {/* Checkbox options */}
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRgbData}
                  onChange={(e) => setIncludeRgbData(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-slate-300">Include RGB & HSV Swatches</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBoundingBox}
                  onChange={(e) => setIncludeBoundingBox(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-slate-300">Include Bounding Box Box Coordinates</span>
              </label>
            </div>
          </div>
        </div>

        {/* Optional Raw CSV Code View */}
        {showRawCsvPreview && (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Raw CSV Output Stream Preview:</span>
              <span>{generateConsolidatedCsvContent().split('\n').length - 1} rows</span>
            </div>
            <pre className="text-[11px] font-mono text-emerald-300/90 bg-slate-900 p-3 rounded-lg overflow-x-auto max-h-48 scrollbar-thin border border-slate-800 whitespace-pre">
              {generateConsolidatedCsvContent()}
            </pre>
          </div>
        )}

        {/* Interactive CSV Matrix Preview Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
              <Table className="w-4 h-4 text-emerald-400" />
              <span>Consolidated CSV Dataset Table View</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Displaying {jobs.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-mono text-[10px] border-b border-slate-800">
                  <th className="py-2.5 px-3">File Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Marker</th>
                  <th className="py-2.5 px-3 text-right">Pixel/mm</th>
                  <th className="py-2.5 px-3 text-right">Primary Root (mm)</th>
                  <th className="py-2.5 px-3 text-right">Root Area (mm²)</th>
                  <th className="py-2.5 px-3 text-right">Anthocyanin %</th>
                  <th className="py-2.5 px-3 text-right">Stress Factor</th>
                  <th className="py-2.5 px-3 text-right">RGB Mean</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                {jobs.map((job) => {
                  const res = job.result;
                  const plant = job.plantMetrics;
                  const rgb = plant?.anthocyanin?.calibratedRgbMean || [138, 72, 102];

                  return (
                    <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        {job.fileName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          job.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {res?.markerFound ? (
                          <span className="text-emerald-400 font-bold">YES ({res.confidence}%)</span>
                        ) : (
                          <span className="text-slate-500">NO</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                        {res?.pixelPerMmRatio ? `${res.pixelPerMmRatio} px/mm` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-cyan-300 font-bold">
                        {plant?.root?.primaryRootLengthMm ? `${plant.root.primaryRootLengthMm} mm` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-teal-300">
                        {plant?.root?.totalRootAreaMm2 ? `${plant.root.totalRootAreaMm2} mm²` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-purple-400 font-bold">
                        {plant?.anthocyanin?.anthocyaninIndexPercent ? `${plant.anthocyanin.anthocyaninIndexPercent}%` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-400">
                        {plant?.anthocyanin?.stressFactorScore ? `${plant.anthocyanin.stressFactorScore} / 10` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <span
                            className="w-3 h-3 rounded-full border border-slate-700 shadow-sm"
                            style={{ backgroundColor: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` }}
                          ></span>
                          <span className="text-[10px] text-slate-400">
                            [{rgb.join(',')}]
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dataset Batch File Items Queue Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-200">Dataset Batch File Items Queue</h3>
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

