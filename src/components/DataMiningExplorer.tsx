import React, { useState } from 'react';
import { MinedDatasetItem } from '../types';
import { Search, ExternalLink, ThumbsUp, ShieldCheck, Filter, Globe, BookOpen, Lock } from 'lucide-react';

interface DataMiningExplorerProps {
  minedItems: MinedDatasetItem[];
  onToggleVerify: (id: string) => void;
  onUpvote: (id: string) => void;
}

export const DataMiningExplorer: React.FC<DataMiningExplorerProps> = ({
  minedItems,
  onToggleVerify,
  onUpvote,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const filtered = minedItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.species.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.doiOrUrl.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === 'all' || item.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-purple-400 font-mono text-xs mb-1">
              <Globe className="w-4 h-4" />
              <span>PHASE 3: ETHICAL DATA MINING & WEB INDEXER</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              Open Access Research Repository Directory
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Targeted crawler and API-first retrieval indexing images containing the AstroBotany calibration sticker from NASA OSDR, bioRxiv preprints, Zenodo, and open botanical repositories.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-purple-950/40 p-3 rounded-lg border border-purple-500/20 text-xs font-mono text-purple-300">
            <Lock className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <span className="font-bold block">Data Minimization Policy Active</span>
              <span className="text-[10px] text-purple-400/80">
                Only storing URLs, DOIs & match confidence. Full resolution assets remain hosted at original source.
              </span>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by species, title, or DOI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">Source Repository:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Repositories ({minedItems.length})</option>
              <option value="NASA OSDR">NASA OSDR</option>
              <option value="bioRxiv">bioRxiv</option>
              <option value="Flickr Research">Flickr Research</option>
              <option value="Zenodo">Zenodo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dataset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all space-y-3 flex flex-col justify-between p-4"
          >
            <div className="space-y-3">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />

                {/* Detected Bounding Box Overlay */}
                {item.detectedMarkerBox && (
                  <div
                    className="absolute border-2 border-purple-400 bg-purple-500/20 rounded shadow-md pointer-events-none"
                    style={{
                      top: `${item.detectedMarkerBox.ymin}%`,
                      left: `${item.detectedMarkerBox.xmin}%`,
                      width: `${item.detectedMarkerBox.xmax - item.detectedMarkerBox.xmin}%`,
                      height: `${item.detectedMarkerBox.ymax - item.detectedMarkerBox.ymin}%`,
                    }}
                  >
                    <span className="absolute -top-5 left-0 bg-purple-600 text-[9px] font-mono text-white px-1 py-0.5 rounded shadow">
                      {item.confidenceScore}% match
                    </span>
                  </div>
                )}

                <div className="absolute top-2 left-2 flex items-center space-x-1">
                  <span className="px-2 py-0.5 bg-slate-950/80 backdrop-blur-md text-purple-300 font-mono text-[10px] rounded border border-slate-700">
                    {item.source}
                  </span>
                </div>

                <div className="absolute top-2 right-2 flex items-center space-x-1">
                  <span className="px-2 py-0.5 bg-emerald-500/90 text-slate-950 font-bold font-mono text-[10px] rounded">
                    {item.confidenceScore}% Confidence
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-200 text-sm leading-snug hover:text-purple-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 italic mt-0.5">{item.species}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">License</span>
                  <span className="text-slate-300 truncate block">{item.license}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">Indexed Date</span>
                  <span className="text-slate-300">{item.minedDate}</span>
                </div>
              </div>
            </div>

            {/* Footer / Verify Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <a
                href={item.doiOrUrl}
                target="_blank"
                rel="noreferrer"
                className="text-purple-400 hover:text-purple-300 flex items-center space-x-1 text-xs font-mono hover:underline"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Source Paper / DOI</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onUpvote(item.id)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono flex items-center space-x-1 transition-colors"
                >
                  <ThumbsUp className="w-3 h-3 text-purple-400" />
                  <span>{item.upvotes}</span>
                </button>

                <button
                  onClick={() => onToggleVerify(item.id)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1 transition-colors ${
                    item.verifiedByCommunity
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{item.verifiedByCommunity ? 'Verified' : 'Verify'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
