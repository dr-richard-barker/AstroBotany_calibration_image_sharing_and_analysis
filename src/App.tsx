import React, { useState } from 'react';
import { Header } from './components/Header';
import { GroundTruthLibrary } from './components/GroundTruthLibrary';
import { MarkerDetector } from './components/MarkerDetector';
import { DataMiningExplorer } from './components/DataMiningExplorer';
import { BatchProcessing } from './components/BatchProcessing';
import { AstroRootAnthocyaninStudio } from './components/AstroRootAnthocyaninStudio';
import { HuggingFaceExporter } from './components/HuggingFaceExporter';
import { ExoLabTimelapseExplorer } from './components/ExoLabTimelapseExplorer';

import { GroundTruthImage, MinedDatasetItem, BatchJobItem, ExoLabFrame } from './types';
import { INITIAL_GROUND_TRUTH } from './data/groundTruthData';
import { INITIAL_MINED_DATASETS } from './data/minedDatasets';
import {
  Database,
  Sparkles,
  Search,
  Layers,
  Cpu,
  Share2,
  Menu,
  X,
  Upload,
  CheckCircle2,
  Film
} from 'lucide-react';


export default function App() {
  const [activeTab, setActiveTab] = useState<string>('ground-truth');
  const [groundTruthList, setGroundTruthList] = useState<GroundTruthImage[]>(INITIAL_GROUND_TRUTH);
  const [minedList, setMinedList] = useState<MinedDatasetItem[]>(INITIAL_MINED_DATASETS);
  const [geminiActive, setGeminiActive] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeAnalysisImage, setActiveAnalysisImage] = useState<GroundTruthImage | null>(null);

  const handleAnalyzeExoLabFrame = (frame: ExoLabFrame, targetTab: string = 'detection-agent') => {
    const imageItem: GroundTruthImage = {
      id: `gt-${frame.frameId}`,
      title: `ExoLab-11 Flight Day ${frame.flightDay} (${frame.timestampIso.split('T')[0]})`,
      species: frame.species,
      category: 'positive',
      imageUrl: frame.imageUrl,
      description: `ExoLab-11 spaceflight time-lapse frame captured on Flight Day ${frame.flightDay} with AstroBotany ABC marker card.`,
      lightingCondition: 'ExoLab Chamber Dual LED Spectrum',
      angle: '0° Nadir Fixed Time-Lapse Camera',
      occluded: false,
      pixelPerMm: frame.pixelPerMm,
      boundingBox: frame.boundingBox,
      experimentId: 'ExoLab_11-ISS-2026',
      tags: ['ExoLab-11', 'ABC Marker', `Flight Day ${frame.flightDay}`, 'Microgravity', 'Time-Lapse'],
    };

    setGroundTruthList((prev) => {
      if (prev.some((img) => img.id === imageItem.id)) return prev;
      return [imageItem, ...prev];
    });

    setActiveAnalysisImage(imageItem);
    setActiveTab(targetTab);
  };

  const handleUpdateGroundTruth = (updatedImg: GroundTruthImage) => {
    setGroundTruthList((prev) =>
      prev.map((img) => (img.id === updatedImg.id ? updatedImg : img))
    );
  };

  // Initial batch queue items
  const [batchQueue, setBatchQueue] = useState<BatchJobItem[]>([
    {
      id: 'batch-01',
      fileName: 'ISS_APH_Tray_2026_Col0_001.jpg',
      fileSize: '3.4 MB',
      previewUrl: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=300&q=80',
      status: 'completed',
      result: {
        id: 'det-b01',
        markerFound: true,
        confidence: 98.4,
        boundingBox: { ymin: 12, xmin: 75, ymax: 32, xmax: 92 },
        markerType: 'astrocalibration_v2_grid',
        pixelPerMmRatio: 14.2,
        rotationAngleDeg: 2.1,
        lightingQuality: 'optimal',
        occlusionPercentage: 0,
        colorCalibration: [],
        detectedAt: new Date().toISOString(),
      },
      plantMetrics: {
        root: {
          primaryRootLengthMm: 36.2,
          totalRootAreaMm2: 84.1,
          lateralRootCount: 15,
          rootBranchingDensity: 0.41,
          averageRootDiameterMm: 0.64,
        },
        anthocyanin: {
          anthocyaninIndexPercent: 34.1,
          calibratedRgbMean: [140, 70, 100],
          hsvHueAngle: 331,
          stressFactorScore: 4.1,
        },
      },
    },
    {
      id: 'batch-02',
      fileName: 'Brachypodium_Root_Agar_Tray_B4.jpg',
      fileSize: '2.8 MB',
      previewUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=300&q=80',
      status: 'queued',
    },
    {
      id: 'batch-03',
      fileName: 'Solanum_Canopy_Anthocyanin_T9.jpg',
      fileSize: '4.1 MB',
      previewUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb231fc?auto=format&fit=crop&w=300&q=80',
      status: 'queued',
    },
    {
      id: 'batch-04',
      fileName: 'Oryza_Dwarf_Harvest_OSDR.jpg',
      fileSize: '3.9 MB',
      previewUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=300&q=80',
      status: 'queued',
    },
  ]);

  const navItems = [
    { id: 'ground-truth', label: 'Marker Database', sublabel: 'Phase 1 Curation', icon: Database },
    { id: 'exolab-11', label: 'ExoLab-11 Time-Lapse', sublabel: 'GitHub Dataset Series', icon: Film },
    { id: 'detection-agent', label: 'Detection Agent', sublabel: 'Phase 2 Gemini Vision', icon: Sparkles },
    { id: 'data-mining', label: 'Community Library', sublabel: 'Phase 3 Ethical Mining', icon: Search },
    { id: 'batch-pipeline', label: 'Batch Processing', sublabel: 'Automated Pipeline', icon: Layers },
    { id: 'phenotype-studio', label: 'Quantification Analytics', sublabel: 'AstroRoot & Anthocyanin', icon: Cpu },
    { id: 'hf-export', label: 'Export & Share', sublabel: 'Phase 4 HF & PlantCV', icon: Share2 },
  ];

  const handleAddGroundTruth = (newImg: GroundTruthImage) => {
    setGroundTruthList((prev) => [newImg, ...prev]);
  };

  const handleToggleVerifyMined = (id: string) => {
    setMinedList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, verifiedByCommunity: !item.verifiedByCommunity } : item
      )
    );
  };

  const handleUpvoteMined = (id: string) => {
    setMinedList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, upvotes: item.upvotes + 1 } : item
      )
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-sky-500/30 selection:text-sky-200">
      {/* Mobile Sidebar Overlay Toggle */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center font-bold text-lg italic text-white shadow-md shadow-sky-500/30">
            A
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white">AstroBotany DB</h1>
            <span className="text-[10px] text-sky-400 font-mono">astrocalibration</span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800 border border-slate-700"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`w-64 bg-slate-900 text-white flex flex-col shrink-0 border-r border-slate-800 ${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:flex sticky top-0 h-screen z-40`}
      >
        {/* Brand Header */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center font-bold text-lg italic text-white shadow-md shadow-sky-500/30">
            A
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">AstroBotany</h1>
            <p className="text-[10px] font-mono text-sky-400">PlantCV Marker DB</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  isActive
                    ? 'bg-sky-600/20 text-sky-400 border-l-2 border-sky-500 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <div>
                  <div className="text-sm font-medium leading-none">{item.label}</div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">{item.sublabel}</div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Pipeline Health Card */}
        <div className="p-4 mt-auto border-t border-slate-800/80">
          <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700/80">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Pipeline Health</p>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Detection Agent</span>
                <span className="text-sky-400 font-mono">Gemini 3.6</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">PlantCV Standard</span>
                <span className="text-emerald-400 font-mono">10mm Scale</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100">
        {/* Top Header Bar */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sm:px-8 shrink-0 sticky top-0 z-30">
          <div className="flex items-center flex-1 max-w-xl pr-4">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search markers by embedding, species, or metadata..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('ground-truth')}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Dataset</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-semibold text-xs text-sky-400">
                DR
              </div>
              <div className="text-left text-xs hidden lg:block">
                <div className="font-semibold text-slate-200 leading-none">Dr. Richard Barker</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">AstroBotany Lead</div>
              </div>
            </div>
          </div>
        </header>

        {/* Top Key Stats Header Banner */}
        <div className="p-4 sm:p-8 pb-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-tight">Indexed Images</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">14,208</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-tight">Calibration Matches</p>
              <p className="text-2xl font-bold text-sky-400 mt-1">8,942</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-tight">Precision Score</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">99.4%</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-tight">Shared Protocols</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">126</p>
            </div>
          </div>

          {/* Tab Views */}
          <div className="pb-8">
            {activeTab === 'ground-truth' && (
              <GroundTruthLibrary
                images={groundTruthList}
                onAddImage={handleAddGroundTruth}
                onUpdateImage={handleUpdateGroundTruth}
              />
            )}

            {activeTab === 'exolab-11' && (
              <ExoLabTimelapseExplorer onAnalyzeFrame={handleAnalyzeExoLabFrame} />
            )}

            {activeTab === 'detection-agent' && (
              <MarkerDetector
                sampleImages={groundTruthList}
                activeImage={activeAnalysisImage}
              />
            )}

            {activeTab === 'data-mining' && (
              <DataMiningExplorer
                minedItems={minedList}
                onToggleVerify={handleToggleVerifyMined}
                onUpvote={handleUpvoteMined}
              />
            )}

            {activeTab === 'batch-pipeline' && (
              <BatchProcessing initialJobs={batchQueue} />
            )}

            {activeTab === 'phenotype-studio' && (
              <AstroRootAnthocyaninStudio
                sampleImages={groundTruthList}
                activeImage={activeAnalysisImage}
              />
            )}

            {activeTab === 'hf-export' && <HuggingFaceExporter />}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto bg-slate-900 border-t border-slate-800 text-slate-400 py-4 px-4 sm:px-8 text-xs font-mono">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
              <span className="text-slate-300">AstroBotany Calibration Database & PlantCV Marker Pipeline</span>
            </div>

            <div className="flex items-center space-x-4 text-slate-500 text-[11px]">
              <span>PlantCV &quot;astrocalibration&quot; Standard</span>
              <span>•</span>
              <span>AstroRoot & Anthocyanin Ready</span>
              <span>•</span>
              <span>Creative Commons CC-BY 4.0</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

