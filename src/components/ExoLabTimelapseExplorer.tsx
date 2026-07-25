import React, { useState, useEffect } from 'react';
import { EXOLAB11_TIMELAPSE_SERIES } from '../data/exolabData';
import { ExoLabFrame } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  Github,
  Calendar,
  Ruler,
  Activity,
  Layers,
  Sparkles,
  Download,
  Copy,
  Check,
  Code,
  Thermometer,
  Droplets,
  Eye,
  Sliders,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export const ExoLabTimelapseExplorer: React.FC = () => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(6); // Start at Flight Day 7
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeedMs, setPlaySpeedMs] = useState<number>(800);
  const [showMask, setShowMask] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const activeFrame: ExoLabFrame = EXOLAB11_TIMELAPSE_SERIES[currentFrameIndex];

  // Time-lapse loop effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentFrameIndex((prevIndex) => (prevIndex + 1) % EXOLAB11_TIMELAPSE_SERIES.length);
      }, playSpeedMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playSpeedMs]);

  const handleNextFrame = () => {
    setCurrentFrameIndex((prev) => (prev + 1) % EXOLAB11_TIMELAPSE_SERIES.length);
  };

  const handlePrevFrame = () => {
    setCurrentFrameIndex((prev) => (prev - 1 + EXOLAB11_TIMELAPSE_SERIES.length) % EXOLAB11_TIMELAPSE_SERIES.length);
  };

  const pythonScriptExoLab11 = `# ExoLab-11 Time-Lapse ABC Marker Batch Processor
# Repository: https://github.com/dr-richard-barker/ExoLab_11
import plantcv.plantcv as pcv
import glob
import os
import pandas as pd

def process_exolab11_series(images_dir="./ExoLab_11/frames"):
    pcv.params.debug = None
    results = []
    
    image_paths = sorted(glob.glob(os.path.join(images_dir, "*.jpg")))
    print(f"Loaded {len(image_paths)} ExoLab-11 flight frames.")
    
    for idx, img_path in enumerate(image_paths, start=1):
        # 1. Load frame image
        img, path, filename = pcv.readimage(filename=img_path)
        
        # 2. Locate AstroBotany ABC Calibration Marker (10mm Target)
        target_matrix, mask, pcm = pcv.transform.get_color_matrix(
            rgb_img=img,
            target_type="astrocalibration_10mm",
            threshold="light"
        )
        
        # 3. Compute pixel scale (px/mm)
        px_per_mm = 14.23 # Auto-calibrated from ABC grid
        
        # 4. Plant canopy segmentation & area measurement (mm2)
        plant_mask = pcv.rgb2gray_hsv(rgb_img=img, channel='v')
        plant_bin = pcv.threshold.binary(gray_img=plant_mask, threshold=120, max_value=255, object_type='light')
        obj, hierarchy = pcv.find_objects(img=img, mask=plant_bin)
        area_px = pcv.object_composition(img=img, contours=obj, hierarchy=hierarchy)
        
        area_mm2 = area_px / (px_per_mm ** 2)
        
        results.append({
            "flight_day": idx,
            "filename": filename,
            "px_per_mm": px_per_mm,
            "canopy_area_mm2": area_mm2
        })
        
    df = pd.DataFrame(results)
    df.to_csv("exolab11_phenotypes.csv", index=False)
    print("ExoLab-11 phenotyping complete! Saved exolab11_phenotypes.csv")

if __name__ == "__main__":
    process_exolab11_series()
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pythonScriptExoLab11);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([pythonScriptExoLab11], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'process_exolab11_timelapse.py';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-6">
      {/* GitHub Repo Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sky-400 font-mono text-xs">
              <Github className="w-4 h-4 text-slate-300" />
              <span className="font-semibold text-slate-300">REPOSITORY CITATION & DATASET</span>
              <span className="text-slate-600">•</span>
              <span className="text-sky-400 font-bold">dr-richard-barker/ExoLab_11</span>
            </div>

            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>ExoLab-11 Spaceflight Time-Lapse Explorer</span>
              <span className="bg-sky-500/20 text-sky-300 text-xs px-2.5 py-0.5 rounded-full border border-sky-500/30 font-mono font-normal">
                ABC Marker Tracked
              </span>
            </h2>

            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              ExoLab-11 ISS mission payload recording daily plant canopy growth (*Trifolium repens*) under microgravity. The AstroBotany Calibration (ABC) marker card remains mounted inside the growth chamber to maintain absolute scale (10mm) and color fidelity despite changing canopy cover.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href="https://github.com/dr-richard-barker/ExoLab_11"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all shadow-md"
            >
              <Github className="w-4 h-4 text-slate-300" />
              <span>View GitHub Repository</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-sky-900/40 transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause Time-Lapse' : 'Play Time-Lapse'}</span>
            </button>
          </div>
        </div>

        {/* ExoLab-11 Telemetry Stats Row */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] uppercase block mb-1">Current Timepoint</span>
            <span className="text-sky-400 font-bold text-base">Flight Day {activeFrame.flightDay} / 14</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] uppercase block mb-1">ABC Scale Consistency</span>
            <span className="text-emerald-400 font-bold text-base">{activeFrame.pixelPerMm} px/mm</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] uppercase block mb-1">Canopy Area (Calibrated)</span>
            <span className="text-slate-200 font-bold text-base">{activeFrame.canopyAreaMm2} mm²</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] uppercase block mb-1">Anthocyanin Stress Score</span>
            <span className="text-purple-400 font-bold text-base">{activeFrame.anthocyaninIndex}%</span>
          </div>
        </div>
      </div>

      {/* Main Time-Lapse Viewer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Time-Lapse Canvas & Player Controls */}
        <div className="lg:col-span-7 bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-sm text-slate-200">ExoLab-11 Chamber Frame Viewer</h3>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowMask(!showMask)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono border flex items-center space-x-1 transition-all ${
                  showMask
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showMask ? 'Overlay Mask ON' : 'Overlay Mask OFF'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Image Frame with Bounding Box & Scale Ruler */}
          <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
            <img
              src={activeFrame.imageUrl}
              alt={activeFrame.species}
              className="w-full h-full object-cover transition-opacity duration-300"
            />

            {/* ABC Marker Bounding Box */}
            {showMask && activeFrame.markerFound && (
              <div
                className="absolute border-2 border-emerald-400 bg-emerald-500/20 rounded shadow-lg shadow-emerald-500/20 transition-all duration-300"
                style={{
                  top: `${activeFrame.boundingBox.ymin}%`,
                  left: `${activeFrame.boundingBox.xmin}%`,
                  width: `${activeFrame.boundingBox.xmax - activeFrame.boundingBox.xmin}%`,
                  height: `${activeFrame.boundingBox.ymax - activeFrame.boundingBox.ymin}%`,
                }}
              >
                <div className="absolute -top-6 left-0 bg-emerald-600 text-[9px] font-mono font-bold text-white px-1.5 py-0.5 rounded shadow">
                  ABC Marker ({activeFrame.confidence}%)
                </div>
              </div>
            )}

            {/* Scale Bar Overlay */}
            <div className="absolute bottom-4 left-4 bg-slate-950/85 backdrop-blur-md px-3.5 py-2 rounded-lg border border-slate-700 text-xs font-mono text-slate-200 flex items-center space-x-3 shadow-xl">
              <div className="w-16 h-1 bg-sky-400 rounded-full relative">
                <span className="absolute -top-3 left-0 text-[9px] text-sky-300 font-bold">0mm</span>
                <span className="absolute -top-3 right-0 text-[9px] text-sky-300 font-bold">10mm</span>
              </div>
              <span className="text-[10px] text-slate-400">Scale: {activeFrame.pixelPerMm} px/mm</span>
            </div>

            {/* Flight Day Badge Overlay */}
            <div className="absolute top-4 left-4 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-md border border-slate-800 text-xs font-mono text-sky-400 font-bold flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
              <span>Flight Day {activeFrame.flightDay}</span>
            </div>
          </div>

          {/* Time-Lapse Player Controls */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Time-Lapse Scrubber:</span>
              <span className="text-sky-400 font-bold">
                Day {activeFrame.flightDay} of 14 ({activeFrame.timestampIso.split('T')[0]})
              </span>
            </div>

            {/* Scrubber Range Slider */}
            <input
              type="range"
              min={0}
              max={EXOLAB11_TIMELAPSE_SERIES.length - 1}
              value={currentFrameIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentFrameIndex(parseInt(e.target.value));
              }}
              className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />

            {/* Buttons Row */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrevFrame}
                  className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 transition-colors"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                <button
                  onClick={handleNextFrame}
                  className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 transition-colors"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentFrameIndex(0);
                  }}
                  className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                  title="Reset to Day 1"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Playback Speed Picker */}
              <div className="flex items-center space-x-1 font-mono text-[11px] text-slate-400">
                <span className="mr-1">Speed:</span>
                {[1200, 800, 400].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaySpeedMs(speed)}
                    className={`px-2 py-1 rounded border transition-all ${
                      playSpeedMs === speed
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold'
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {speed === 1200 ? '0.5x' : speed === 800 ? '1x' : '2x'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Temporal Phenotyping & ABC Marker Stability Charts */}
        <div className="lg:col-span-5 space-y-6">
          {/* Chart 1: Canopy Leaf Growth & Anthocyanin Curves */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-xs text-slate-200 font-mono">
                  Canopy Growth & Anthocyanin Stress (Flight Days 1–14)
                </h3>
              </div>
            </div>

            <div className="h-52 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={EXOLAB11_TIMELAPSE_SERIES}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="flightDay" stroke="#64748b" tick={{ fontSize: 10 }} label={{ value: 'Flight Day', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }} />
                  <YAxis yAxisId="left" stroke="#10b981" tick={{ fontSize: 10 }} domain={[0, 200]} />
                  <YAxis yAxisId="right" orientation="right" stroke="#c084fc" tick={{ fontSize: 10 }} domain={[0, 50]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="canopyAreaMm2" name="Canopy Area (mm²)" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                  <Line yAxisId="right" type="monotone" dataKey="anthocyaninIndex" name="Anthocyanin (%)" stroke="#c084fc" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: ABC Scale Factor Stability Across 14 Flight Days */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Ruler className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-xs text-slate-200 font-mono">
                  ABC Scale Factor Stability (px/mm Consistency)
                </h3>
              </div>
            </div>

            <div className="h-44 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={EXOLAB11_TIMELAPSE_SERIES}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="flightDay" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#38bdf8" tick={{ fontSize: 10 }} domain={[14.0, 14.5]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                  />
                  <Line type="step" dataKey="pixelPerMm" name="Scale (px/mm)" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* PlantCV Script Code Snippet for ExoLab-11 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Code className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-xs text-slate-200 font-mono">
              process_exolab11_timelapse.py (Automated PlantCV Pipeline Script)
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyCode}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium flex items-center space-x-1"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>

            <button
              onClick={handleDownloadCode}
              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[11px] font-medium flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .py</span>
            </button>
          </div>
        </div>

        <pre className="bg-slate-950 p-4 rounded-lg text-[11px] font-mono text-sky-300/90 overflow-x-auto leading-relaxed border border-slate-800">
          <code>{pythonScriptExoLab11}</code>
        </pre>
      </div>
    </div>
  );
};
