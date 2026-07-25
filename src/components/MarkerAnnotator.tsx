import React, { useState, useRef, useEffect } from 'react';
import { AstroMarkerBoundingBox, GroundTruthImage } from '../types';
import { Crosshair, Move, Check, RotateCcw, Ruler, ShieldCheck, Eye, Sparkles, Sliders } from 'lucide-react';

interface MarkerAnnotatorProps {
  image: GroundTruthImage;
  onSaveBoundingBox?: (updatedImage: GroundTruthImage) => void;
}

export const MarkerAnnotator: React.FC<MarkerAnnotatorProps> = ({ image, onSaveBoundingBox }) => {
  // Default box or fallback ymin:15, xmin:72, ymax:35, xmax:90
  const initialBox: AstroMarkerBoundingBox = image.boundingBox || {
    ymin: 15,
    xmin: 72,
    ymax: 35,
    xmax: 90,
  };

  const [box, setBox] = useState<AstroMarkerBoundingBox>(initialBox);
  const [isDragging, setIsDragging] = useState<string | null>(null); // 'center' | 'tl' | 'tr' | 'bl' | 'br'
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragBoxStart, setDragBoxStart] = useState<AstroMarkerBoundingBox>(initialBox);
  const [isVerified, setIsVerified] = useState<boolean>(!!image.boundingBox);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state if selected image changes
  useEffect(() => {
    const defaultB = image.boundingBox || { ymin: 15, xmin: 72, ymax: 35, xmax: 90 };
    setBox(defaultB);
    setIsVerified(!!image.boundingBox);
    setSaveSuccess(false);
  }, [image]);

  // Calculate live px/mm ratio based on bounding box width (10mm reference card)
  // Assuming standard image resolution scale ~1420px width reference
  const cardWidthPercent = Math.max(1, box.xmax - box.xmin);
  const estimatedPixelPerMm = Number(((cardWidthPercent * 14.2) / 10).toFixed(2));

  // Handle Mouse / Touch down on drag handles or box
  const handleMouseDown = (handleType: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(handleType);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragBoxStart({ ...box });
  };

  // Handle Mouse Move during dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const deltaXPercent = ((e.clientX - dragStart.x) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - dragStart.y) / rect.height) * 100;

      let newYmin = dragBoxStart.ymin;
      let newXmin = dragBoxStart.xmin;
      let newYmax = dragBoxStart.ymax;
      let newXmax = dragBoxStart.xmax;

      const minSize = 4; // minimum 4% size

      if (isDragging === 'center') {
        const width = dragBoxStart.xmax - dragBoxStart.xmin;
        const height = dragBoxStart.ymax - dragBoxStart.ymin;

        newXmin = Math.max(0, Math.min(100 - width, dragBoxStart.xmin + deltaXPercent));
        newXmax = newXmin + width;

        newYmin = Math.max(0, Math.min(100 - height, dragBoxStart.ymin + deltaYPercent));
        newYmax = newYmin + height;
      } else if (isDragging === 'tl') {
        newXmin = Math.max(0, Math.min(dragBoxStart.xmax - minSize, dragBoxStart.xmin + deltaXPercent));
        newYmin = Math.max(0, Math.min(dragBoxStart.ymax - minSize, dragBoxStart.ymin + deltaYPercent));
      } else if (isDragging === 'tr') {
        newXmax = Math.min(100, Math.max(dragBoxStart.xmin + minSize, dragBoxStart.xmax + deltaXPercent));
        newYmin = Math.max(0, Math.min(dragBoxStart.ymax - minSize, dragBoxStart.ymin + deltaYPercent));
      } else if (isDragging === 'bl') {
        newXmin = Math.max(0, Math.min(dragBoxStart.xmax - minSize, dragBoxStart.xmin + deltaXPercent));
        newYmax = Math.min(100, Math.max(dragBoxStart.ymin + minSize, dragBoxStart.ymax + deltaYPercent));
      } else if (isDragging === 'br') {
        newXmax = Math.min(100, Math.max(dragBoxStart.xmin + minSize, dragBoxStart.xmax + deltaXPercent));
        newYmax = Math.min(100, Math.max(dragBoxStart.ymin + minSize, dragBoxStart.ymax + deltaYPercent));
      }

      setBox({
        ymin: Number(newYmin.toFixed(1)),
        xmin: Number(newXmin.toFixed(1)),
        ymax: Number(newYmax.toFixed(1)),
        xmax: Number(newXmax.toFixed(1)),
      });
      setIsVerified(false);
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, dragBoxStart]);

  const handleSave = () => {
    const updatedImage: GroundTruthImage = {
      ...image,
      boundingBox: box,
      pixelPerMm: estimatedPixelPerMm > 0 ? estimatedPixelPerMm : image.pixelPerMm,
      occluded: false,
    };
    setIsVerified(true);
    setSaveSuccess(true);
    onSaveBoundingBox?.(updatedImage);

    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleReset = () => {
    const defaultB = image.boundingBox || { ymin: 15, xmin: 72, ymax: 35, xmax: 90 };
    setBox(defaultB);
    setIsVerified(!!image.boundingBox);
  };

  const rectX = box.xmin;
  const rectY = box.ymin;
  const rectW = Math.max(1, box.xmax - box.xmin);
  const rectH = Math.max(1, box.ymax - box.ymin);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Crosshair className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-sm text-slate-100">
            SVG Bounding Box Marker Annotator
          </h3>
          <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30">
            Interactive Editor
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {isVerified && (
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800/80 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Annotation</span>
            </span>
          )}

          <button
            onClick={handleReset}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
            title="Reset bounding box"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Interactive Canvas */}
      <div
        ref={containerRef}
        className="relative aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-800 select-none cursor-crosshair"
      >
        <img
          src={image.imageUrl}
          alt={image.title}
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* SVG Bounding Box Layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Dimmed Background Mask outside bounding box */}
          <defs>
            <mask id={`mask-hole-${image.id}`}>
              <rect x="0" y="0" width="100" height="100" fill="white" />
              <rect x={rectX} y={rectY} width={rectW} height={rectH} fill="black" />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100"
            height="100"
            fill="rgba(15, 23, 42, 0.45)"
            mask={`url(#mask-hole-${image.id})`}
          />

          {/* Target Box Rect */}
          <rect
            x={rectX}
            y={rectY}
            width={rectW}
            height={rectH}
            fill="rgba(16, 185, 129, 0.15)"
            stroke="#10b981"
            strokeWidth="0.8"
            strokeDasharray="2,1"
            className="transition-all"
          />

          {/* Grid target crosshairs inside box */}
          <line
            x1={rectX + rectW / 2}
            y1={rectY}
            x2={rectX + rectW / 2}
            y2={rectY + rectH}
            stroke="#10b981"
            strokeWidth="0.3"
            strokeDasharray="1,1"
            opacity="0.8"
          />
          <line
            x1={rectX}
            y1={rectY + rectH / 2}
            x2={rectX + rectW}
            y2={rectY + rectH / 2}
            stroke="#10b981"
            strokeWidth="0.3"
            strokeDasharray="1,1"
            opacity="0.8"
          />

          {/* Center Target Point */}
          <circle
            cx={rectX + rectW / 2}
            cy={rectY + rectH / 2}
            r="0.8"
            fill="#34d399"
          />
        </svg>

        {/* HTML Interactive Handle Overlays for Dragging */}
        <div
          className="absolute cursor-move group"
          style={{
            top: `${rectY}%`,
            left: `${rectX}%`,
            width: `${rectW}%`,
            height: `${rectH}%`,
          }}
          onMouseDown={(e) => handleMouseDown('center', e)}
        >
          {/* Label Badge */}
          <div className="absolute -top-6 left-0 bg-emerald-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg flex items-center space-x-1 pointer-events-none whitespace-nowrap">
            <Move className="w-2.5 h-2.5 text-emerald-200" />
            <span>AstroMarker Box ({rectW.toFixed(0)}x{rectH.toFixed(0)}%)</span>
          </div>

          {/* Top-Left Corner Handle */}
          <div
            className="absolute -top-2 -left-2 w-4 h-4 bg-emerald-400 border-2 border-slate-950 rounded-full cursor-nwse-resize hover:scale-125 transition-transform shadow-md z-20"
            onMouseDown={(e) => handleMouseDown('tl', e)}
            title="Resize Top-Left"
          ></div>

          {/* Top-Right Corner Handle */}
          <div
            className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-400 border-2 border-slate-950 rounded-full cursor-nesw-resize hover:scale-125 transition-transform shadow-md z-20"
            onMouseDown={(e) => handleMouseDown('tr', e)}
            title="Resize Top-Right"
          ></div>

          {/* Bottom-Left Corner Handle */}
          <div
            className="absolute -bottom-2 -left-2 w-4 h-4 bg-emerald-400 border-2 border-slate-950 rounded-full cursor-nesw-resize hover:scale-125 transition-transform shadow-md z-20"
            onMouseDown={(e) => handleMouseDown('bl', e)}
            title="Resize Bottom-Left"
          ></div>

          {/* Bottom-Right Corner Handle */}
          <div
            className="absolute -bottom-2 -right-2 w-4 h-4 bg-emerald-400 border-2 border-slate-950 rounded-full cursor-nwse-resize hover:scale-125 transition-transform shadow-md z-20"
            onMouseDown={(e) => handleMouseDown('br', e)}
            title="Resize Bottom-Right"
          ></div>
        </div>

        {/* Instructions Overlay on Canvas */}
        <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 flex items-center space-x-2 pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Drag corners or box center to adjust AstroBotany 10mm marker boundaries</span>
        </div>
      </div>

      {/* Numerical Coordinate Fine-Tuning Controls */}
      <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between text-slate-400 text-[11px] border-b border-slate-800/80 pb-2">
          <span className="flex items-center space-x-1">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Precision Coordinate Adjustments (%)</span>
          </span>
          <span className="text-emerald-400 font-bold">
            Width: {rectW.toFixed(1)}% | Height: {rectH.toFixed(1)}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">X Min (Left %)</label>
            <input
              type="number"
              min={0}
              max={box.xmax - 1}
              step={0.5}
              value={box.xmin}
              onChange={(e) => setBox({ ...box, xmin: Math.min(box.xmax - 1, Math.max(0, parseFloat(e.target.value) || 0)) })}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-2 py-1 text-xs focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-1">Y Min (Top %)</label>
            <input
              type="number"
              min={0}
              max={box.ymax - 1}
              step={0.5}
              value={box.ymin}
              onChange={(e) => setBox({ ...box, ymin: Math.min(box.ymax - 1, Math.max(0, parseFloat(e.target.value) || 0)) })}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-2 py-1 text-xs focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-1">X Max (Right %)</label>
            <input
              type="number"
              min={box.xmin + 1}
              max={100}
              step={0.5}
              value={box.xmax}
              onChange={(e) => setBox({ ...box, xmax: Math.max(box.xmin + 1, Math.min(100, parseFloat(e.target.value) || 100)) })}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-2 py-1 text-xs focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-1">Y Max (Bottom %)</label>
            <input
              type="number"
              min={box.ymin + 1}
              max={100}
              step={0.5}
              value={box.ymax}
              onChange={(e) => setBox({ ...box, ymax: Math.max(box.ymin + 1, Math.min(100, parseFloat(e.target.value) || 100)) })}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-2 py-1 text-xs focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Live Scale Calibration Readout */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center space-x-2 text-slate-300">
            <Ruler className="w-4 h-4 text-emerald-400" />
            <span>Calculated Scale Factor:</span>
            <span className="text-emerald-400 font-bold">{estimatedPixelPerMm} px/mm</span>
            <span className="text-slate-500 text-[10px]">(based on 10mm target)</span>
          </div>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-emerald-900/30 transition-all shrink-0"
          >
            <Check className="w-4 h-4" />
            <span>{saveSuccess ? 'Annotation Saved!' : 'Save & Verify Annotation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
