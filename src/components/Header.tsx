import React from 'react';
import { Sprout, Search, Layers, Cpu, Database, Share2, Sparkles, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  geminiActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, geminiActive }) => {
  const navItems = [
    { id: 'ground-truth', label: 'Phase 1: Ground Truth', icon: Database },
    { id: 'detection-agent', label: 'Phase 2: Detection Agent', icon: Sparkles },
    { id: 'data-mining', label: 'Phase 3: Ethical Mining', icon: Search },
    { id: 'batch-pipeline', label: 'Batch Processing', icon: Layers },
    { id: 'phenotype-studio', label: 'AstroRoot & Anthocyanin', icon: Cpu },
    { id: 'hf-export', label: 'Phase 4: HF & PlantCV Export', icon: Share2 },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sprout className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg text-slate-100 tracking-tight">
                  AstroBotany<span className="text-emerald-400 font-medium">Marker</span> DB
                </h1>
                <span className="bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20">
                  PlantCV astrocalibration
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated Marker Detection & Botanical Phenotyping Pipeline
              </p>
            </div>
          </div>

          {/* Status Badges */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md text-xs text-slate-300 border border-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>PlantCV v3.12 Engine</span>
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md text-xs text-slate-300 border border-slate-700">
              <span className={`w-2 h-2 rounded-full ${geminiActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{geminiActive ? 'Gemini 3.6 Vision AI Active' : 'Offline Vision Engine'}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 overflow-x-auto no-scrollbar py-2 border-t border-slate-800/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
