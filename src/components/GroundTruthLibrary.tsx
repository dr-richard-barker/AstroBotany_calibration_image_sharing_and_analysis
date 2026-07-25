import React, { useState } from 'react';
import { GroundTruthImage } from '../types';
import { MarkerAnnotator } from './MarkerAnnotator';
import { Database, Filter, Eye, Plus, CheckCircle, XCircle, Tag, Sun, Compass, Ruler, Download, ShieldCheck, Edit3 } from 'lucide-react';

interface GroundTruthLibraryProps {
  images: GroundTruthImage[];
  onAddImage: (newImg: GroundTruthImage) => void;
  onUpdateImage?: (updatedImg: GroundTruthImage) => void;
}

export const GroundTruthLibrary: React.FC<GroundTruthLibraryProps> = ({ images, onAddImage, onUpdateImage }) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [selectedImage, setSelectedImage] = useState<GroundTruthImage | null>(images[0] || null);
  const [inspectorTab, setInspectorTab] = useState<'view' | 'annotate'>('view');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for adding new ground truth
  const [newTitle, setNewTitle] = useState('');
  const [newSpecies, setNewSpecies] = useState('Arabidopsis thaliana');
  const [newCategory, setNewCategory] = useState<'positive' | 'negative'>('positive');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newLighting, setNewLighting] = useState('Optimal LED Spectrum');
  const [newAngle, setNewAngle] = useState('0° Overhead');
  const [newOccluded, setNewOccluded] = useState(false);
  const [newPixelPerMm, setNewPixelPerMm] = useState(14.0);

  const filteredImages = images.filter((img) => {
    if (categoryFilter === 'all') return true;
    return img.category === categoryFilter;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newImageUrl) return;

    const newItem: GroundTruthImage = {
      id: `gt-user-${Date.now()}`,
      title: newTitle,
      species: newSpecies,
      category: newCategory,
      imageUrl: newImageUrl,
      description: 'User uploaded ground truth reference image for AstroBotany calibration training.',
      lightingCondition: newLighting,
      angle: newAngle,
      occluded: newOccluded,
      boundingBox: newCategory === 'positive' ? { ymin: 20, xmin: 20, ymax: 40, xmax: 40 } : undefined,
      pixelPerMm: newPixelPerMm,
      experimentId: `EXP-USER-${Math.floor(Math.random() * 1000)}`,
      tags: ['User Ground Truth', newSpecies, newCategory === 'positive' ? 'AstroCalibration' : 'Control'],
    };

    onAddImage(newItem);
    setSelectedImage(newItem);
    setShowAddModal(false);
    setNewTitle('');
    setNewImageUrl('');
  };

  const exportGroundTruthJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(images, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "astrobotany_ground_truth_dataset.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs mb-1">
              <Database className="w-4 h-4" />
              <span>PHASE 1: GROUND TRUTH CURATION</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              Reference Library & Calibration Marker Dataset
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Curate positive controls containing the AstroBotany scale sticker (&quot;astrocalibration&quot; marker) under varied lighting, angles, and occlusions alongside negative controls to train precision detection models.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={exportGroundTruthJson}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center space-x-2 transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export Manifest (JSON)</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-md shadow-emerald-900/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Reference Image</span>
            </button>
          </div>
        </div>

        {/* Directory Structure Visualization */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <span className="text-slate-500 block mb-1">Path: dataset/train/positive/</span>
            <span className="text-emerald-400 font-bold text-sm">
              {images.filter((i) => i.category === 'positive').length} Marker Samples
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <span className="text-slate-500 block mb-1">Path: dataset/train/negative/</span>
            <span className="text-amber-400 font-bold text-sm">
              {images.filter((i) => i.category === 'negative').length} Control Samples
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <span className="text-slate-500 block mb-1">PlantCV Marker Standard</span>
            <span className="text-slate-200 font-bold text-sm">10mm x 10mm Scale Grid</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <span className="text-slate-500 block mb-1">Annotation Status</span>
            <span className="text-teal-400 font-bold text-sm flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Bounding Box Verified</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid & Inspector View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Filter & Grid */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300">Filter Dataset:</span>
            </div>

            <div className="flex space-x-1">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({images.length})
              </button>
              <button
                onClick={() => setCategoryFilter('positive')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  categoryFilter === 'positive'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Positive (With Sticker)
              </button>
              <button
                onClick={() => setCategoryFilter('negative')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  categoryFilter === 'negative'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Negative Controls
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredImages.map((img) => {
              const isSelected = selectedImage?.id === img.id;
              const isPositive = img.category === 'positive';
              return (
                <div
                  key={img.id}
                  onClick={() => setSelectedImage(img)}
                  className={`bg-slate-900 rounded-xl overflow-hidden border transition-all cursor-pointer group ${
                    isSelected
                      ? 'border-emerald-500 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-900/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="relative aspect-video bg-slate-950 overflow-hidden">
                    <img
                      src={img.imageUrl}
                      alt={img.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Bounding box preview overlay if positive */}
                    {isPositive && img.boundingBox && (
                      <div
                        className="absolute border-2 border-emerald-400 bg-emerald-400/20 shadow-md shadow-emerald-950/80 pointer-events-none"
                        style={{
                          top: `${img.boundingBox.ymin}%`,
                          left: `${img.boundingBox.xmin}%`,
                          width: `${img.boundingBox.xmax - img.boundingBox.xmin}%`,
                          height: `${img.boundingBox.ymax - img.boundingBox.ymin}%`,
                        }}
                      >
                        <span className="absolute -top-5 left-0 bg-emerald-600 text-[9px] font-mono text-white px-1 py-0.5 rounded shadow">
                          astrocalibration
                        </span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 flex items-center space-x-1.5">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isPositive
                            ? 'bg-emerald-500/90 text-white border-emerald-400'
                            : 'bg-amber-500/90 text-slate-950 border-amber-400'
                        }`}
                      >
                        {isPositive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{isPositive ? 'Positive (Sticker)' : 'Negative Control'}</span>
                      </span>
                    </div>

                    <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 border border-slate-700">
                      {img.pixelPerMm} px/mm
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-xs text-slate-200 line-clamp-1 group-hover:text-emerald-400 transition-colors">
                        {img.title}
                      </h3>
                    </div>

                    <p className="text-[11px] text-slate-400 italic line-clamp-1">
                      {img.species}
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {img.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded border border-slate-700/60"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Ground Truth Inspector or Interactive SVG Marker Annotator */}
        <div className="lg:col-span-5">
          {selectedImage ? (
            <div className="space-y-4 sticky top-20">
              {/* Mode Selector Tabs */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-2 flex items-center justify-between">
                <div className="flex space-x-1 w-full">
                  <button
                    onClick={() => setInspectorTab('view')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                      inspectorTab === 'view'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ground Truth Inspector</span>
                  </button>

                  <button
                    onClick={() => setInspectorTab('annotate')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                      inspectorTab === 'annotate'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Interactive SVG Annotator</span>
                  </button>
                </div>
              </div>

              {/* View 1: Standard Ground Truth Inspector */}
              {inspectorTab === 'view' ? (
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <h3 className="font-bold text-sm text-slate-200">Ground Truth Inspector</h3>
                    </div>
                    <span className="font-mono text-xs text-slate-500">{selectedImage.experimentId}</span>
                  </div>

                  {/* Large Image with Bounding Box Overlay */}
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                    <img
                      src={selectedImage.imageUrl}
                      alt={selectedImage.title}
                      className="w-full h-full object-cover"
                    />

                    {selectedImage.category === 'positive' && selectedImage.boundingBox && (
                      <div
                        className="absolute border-2 border-emerald-400 bg-emerald-500/20 rounded shadow-lg shadow-emerald-950/80"
                        style={{
                          top: `${selectedImage.boundingBox.ymin}%`,
                          left: `${selectedImage.boundingBox.xmin}%`,
                          width: `${selectedImage.boundingBox.xmax - selectedImage.boundingBox.xmin}%`,
                          height: `${selectedImage.boundingBox.ymax - selectedImage.boundingBox.ymin}%`,
                        }}
                      >
                        <div className="absolute -top-6 left-0 bg-emerald-500 text-slate-950 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow flex items-center space-x-1">
                          <span>astrocalibration</span>
                          <span className="opacity-80">10mm</span>
                        </div>

                        {/* Corner Target Marks */}
                        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white"></div>
                        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white"></div>
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white"></div>
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white"></div>
                      </div>
                    )}
                  </div>

                  {/* Specs & Metadata */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <h4 className="font-semibold text-slate-200 text-sm">{selectedImage.title}</h4>
                      <p className="text-slate-400 text-xs mt-0.5">{selectedImage.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Plant Species</span>
                        <span className="text-slate-300 font-medium">{selectedImage.species}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 text-[10px] block">Scale Ratio</span>
                        <span className="text-emerald-400 font-semibold">{selectedImage.pixelPerMm} px/mm</span>
                      </div>

                      <div>
                        <span className="text-slate-500 text-[10px] block flex items-center space-x-1">
                          <Sun className="w-3 h-3 text-amber-400" />
                          <span>Lighting</span>
                        </span>
                        <span className="text-slate-300">{selectedImage.lightingCondition}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 text-[10px] block flex items-center space-x-1">
                          <Compass className="w-3 h-3 text-cyan-400" />
                          <span>Camera Angle</span>
                        </span>
                        <span className="text-slate-300">{selectedImage.angle}</span>
                      </div>
                    </div>

                    {/* Launch Marker Annotator Button */}
                    <button
                      onClick={() => setInspectorTab('annotate')}
                      className="w-full py-2.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg font-semibold text-xs flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Edit3 className="w-4 h-4 text-emerald-400" />
                      <span>Adjust / Verify Marker Bounding Box via SVG Annotator</span>
                    </button>

                    {/* AstroBotany Sticker Marker Schema Card */}
                    {selectedImage.category === 'positive' && (
                      <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-emerald-400 font-semibold text-xs">
                          <span>AstroBotany Marker Grid Features</span>
                          <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded">PlantCV Standard</span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-300">
                          <span>• Dual-Color Checkerboard Grid</span>
                          <span className="text-emerald-400 font-mono">10mm x 10mm</span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-300">
                          <span>• Color Calibration Target Swatches</span>
                          <div className="flex space-x-1">
                            <span className="w-2.5 h-2.5 bg-white border border-slate-600 rounded-full"></span>
                            <span className="w-2.5 h-2.5 bg-gray-500 rounded-full"></span>
                            <span className="w-2.5 h-2.5 bg-black rounded-full"></span>
                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                            <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-300">
                          <span>• Sub-Pixel Concentric Alignment Ring</span>
                          <span className="text-teal-400 font-mono">±0.05mm Precision</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* View 2: SVG Marker Annotator Component */
                <MarkerAnnotator
                  image={selectedImage}
                  onSaveBoundingBox={(updatedImg) => {
                    onUpdateImage?.(updatedImg);
                    setSelectedImage(updatedImg);
                  }}
                />
              )}
            </div>
          ) : (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-8 text-center text-slate-500 text-xs">
              Select an image from the dataset grid to inspect marker ground truth specifications.
            </div>
          )}
        </div>
      </div>

      {/* Add Ground Truth Image Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base">Add Ground Truth Reference Image</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Image Title / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arabidopsis Flight Chamber - High Shadow"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="positive">Positive (Contains Sticker)</option>
                    <option value="negative">Negative Control (No Sticker)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Species</label>
                  <input
                    type="text"
                    value={newSpecies}
                    onChange={(e) => setNewSpecies(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Image URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/photo-..."
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Lighting Profile</label>
                  <input
                    type="text"
                    value={newLighting}
                    onChange={(e) => setNewLighting(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Pixel/mm Ratio</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newPixelPerMm}
                    onChange={(e) => setNewPixelPerMm(parseFloat(e.target.value) || 10)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="occludedCheck"
                  checked={newOccluded}
                  onChange={(e) => setNewOccluded(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="occludedCheck" className="text-slate-300">
                  Marker is partially occluded by leaves/hardware
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-900/30"
                >
                  Save Ground Truth
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
