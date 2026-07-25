import React, { useState } from 'react';
import { GroundTruthImage, AstroRootMetrics, AnthocyaninMetrics } from '../types';
import { Cpu, Dna, Activity, Ruler, BarChart2, RefreshCw, Sliders, CheckCircle, Sparkles } from 'lucide-react';

interface StudioProps {
  sampleImages: GroundTruthImage[];
}

export const AstroRootAnthocyaninStudio: React.FC<StudioProps> = ({ sampleImages }) => {
  const [selectedImage, setSelectedImage] = useState<GroundTruthImage>(sampleImages[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [rootMetrics, setRootMetrics] = useState<AstroRootMetrics>({
    primaryRootLengthMm: 34.8,
    totalRootAreaMm2: 82.4,
    lateralRootCount: 14,
    rootBranchingDensity: 0.4,
    averageRootDiameterMm: 0.65,
  });

  const [anthoMetrics, setAnthoMetrics] = useState<AnthocyaninMetrics>({
    anthocyaninIndexPercent: 32.6,
    calibratedRgbMean: [142, 68, 98],
    hsvHueAngle: 332,
    stressFactorScore: 4.2,
  });

  const runPhenotypeAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-plant-phenotype', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId: selectedImage.id,
          pixelPerMmRatio: selectedImage.pixelPerMm || 14.2,
        }),
      });

      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      if (data.root) setRootMetrics(data.root);
      if (data.anthocyanin) setAnthoMetrics(data.anthocyanin);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-teal-400 font-mono text-xs mb-1">
              <Cpu className="w-4 h-4" />
              <span>ASTROROOT & ANTHOCYANIN QUANTIFICATION PIPELINE</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              Downstream Botanical Phenotyping Suite
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Utilize calibrated scale metrics (px/mm) and color fidelity cards from the AstroBotany marker to perform precision root morphology extraction and anthocyanin stress pigment quantification.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={runPhenotypeAnalysis}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-md shadow-teal-900/30 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing Phenotypes...' : 'Run Quantitative Pipeline'}</span>
            </button>
          </div>
        </div>

        {/* Sample Picker */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <span className="text-xs font-semibold text-slate-400 block mb-2">
            Select Specimen Image to Quantify:
          </span>
          <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
            {sampleImages.map((sample) => (
              <button
                key={sample.id}
                onClick={() => {
                  setSelectedImage(sample);
                  runPhenotypeAnalysis();
                }}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap transition-all ${
                  selectedImage.id === sample.id
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-semibold'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <img src={sample.imageUrl} alt="" className="w-4 h-4 rounded object-cover" />
                <span className="truncate max-w-[150px]">{sample.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Layout: Visual Canvas & Dual Analytics Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Specimen Canvas with Scale Overlay */}
        <div className="lg:col-span-6 bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-200 flex items-center space-x-2">
              <Ruler className="w-4 h-4 text-teal-400" />
              <span>Calibrated Image Canvas</span>
            </h3>

            <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Scale: {selectedImage.pixelPerMm} px/mm
            </span>
          </div>

          <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
            <img src={selectedImage.imageUrl} alt={selectedImage.title} className="w-full h-full object-cover" />

            {/* Simulated Calibrated Millimeter Ruler Overlay */}
            <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-md border border-slate-700 text-xs font-mono text-slate-200 flex items-center space-x-3 shadow-lg">
              <div className="w-16 h-1 bg-emerald-400 rounded-full relative">
                <span className="absolute -top-3 left-0 text-[9px] text-emerald-300">0mm</span>
                <span className="absolute -top-3 right-0 text-[9px] text-emerald-300">10mm</span>
              </div>
              <span className="text-[10px] text-slate-400">AstroBotany Calibrated</span>
            </div>

            {/* Bounding Box Marker Overlay */}
            {selectedImage.boundingBox && (
              <div
                className="absolute border border-emerald-400/80 bg-emerald-500/10 rounded"
                style={{
                  top: `${selectedImage.boundingBox.ymin}%`,
                  left: `${selectedImage.boundingBox.xmin}%`,
                  width: `${selectedImage.boundingBox.xmax - selectedImage.boundingBox.xmin}%`,
                  height: `${selectedImage.boundingBox.ymax - selectedImage.boundingBox.ymin}%`,
                }}
              >
                <span className="absolute -top-5 left-0 bg-emerald-600 text-[8px] font-mono text-white px-1 rounded">
                  Calib Anchor
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: AstroRoot & Anthocyanin Dual Panels */}
        <div className="lg:col-span-6 space-y-6">
          {/* Panel 1: AstroRoot Analysis */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Dna className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-slate-200">AstroRoot Phenotyping Metrics</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Root Architecture</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Primary Root Length</span>
                <span className="text-cyan-400 text-lg font-bold">{rootMetrics.primaryRootLengthMm} mm</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Total Root Area</span>
                <span className="text-teal-400 text-lg font-bold">{rootMetrics.totalRootAreaMm2} mm²</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Lateral Root Count</span>
                <span className="text-slate-200 text-base font-bold">{rootMetrics.lateralRootCount} roots</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Branching Density</span>
                <span className="text-slate-200 text-base font-bold">{rootMetrics.rootBranchingDensity} / mm</span>
              </div>
            </div>
          </div>

          {/* Panel 2: Anthocyanin Pigment Quantification */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm text-slate-200">Anthocyanin Stress Pigment Index</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Color Card Calibrated</span>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] block">Anthocyanin Index (ACI)</span>
                  <span className="text-purple-400 text-xl font-bold">{anthoMetrics.anthocyaninIndexPercent}%</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className="w-6 h-6 rounded-full border border-slate-700 shadow-inner"
                    style={{
                      backgroundColor: `rgb(${anthoMetrics.calibratedRgbMean.join(',')})`,
                    }}
                  ></span>
                  <div className="text-[10px] text-slate-400">
                    <div>R:{anthoMetrics.calibratedRgbMean[0]} G:{anthoMetrics.calibratedRgbMean[1]} B:{anthoMetrics.calibratedRgbMean[2]}</div>
                    <div>HSV Hue: {anthoMetrics.hsvHueAngle}°</div>
                  </div>
                </div>
              </div>

              {/* Stress Factor Score Indicator Bar */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Microgravity Stress Factor:</span>
                  <span className="text-amber-400 font-bold">{anthoMetrics.stressFactorScore} / 10</span>
                </div>

                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 rounded-full"
                    style={{ width: `${(anthoMetrics.stressFactorScore / 10) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
