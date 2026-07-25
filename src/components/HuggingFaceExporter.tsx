import React, { useState } from 'react';
import { Share2, Download, Copy, Check, FileCode, BookOpen, ExternalLink, ShieldCheck, Database } from 'lucide-react';

export const HuggingFaceExporter: React.FC = () => {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const hfReadmeContent = `---
license: cc-by-4.0
task_categories:
- computer-vision
- object-detection
- image-segmentation
tags:
- astrobotany
- plantcv
- astrocalibration
- botany
- microgravity
- scale-marker
dataset_info:
  features:
  - name: image
    dtype: image
  - name: image_id
    dtype: string
  - name: species
    dtype: string
  - name: astrocalibration_box
    sequence: float32
  - name: px_per_mm
    dtype: float32
size_categories:
- n<1K
---

# AstroBotany Calibration Marker Dataset ("astrocalibration")

## Dataset Description
This dataset contains high-resolution botanical research images annotated with the **AstroBotany calibration marker** (the standard "astrocalibration" card used in PlantCV pipelines).

### Purpose
To train, evaluate, and benchmark visual retrieval and object detection models (e.g. YOLO, Gemini Vision, CLIP) for automatic identification of botanical scale markers in spaceflight and laboratory plant phenotyping datasets.

### License & Attribution
- **License**: Creative Commons Attribution 4.0 International (CC-BY 4.0)
- **Primary Pipeline Integration**: Compatible with [PlantCV](https://plantcv.org/), AstroRoot, and Anthocyanin quantification pipelines.
- **Maintainer**: Dr. Richard Barker & AstroBotany Open Community
`;

  const hfMetadataJsonl = `{"file_name": "train/img_001.jpg", "species": "Arabidopsis thaliana", "bbox": [12, 75, 32, 92], "px_per_mm": 14.2, "marker_type": "astrocalibration_v2"}
{"file_name": "train/img_002.jpg", "species": "Brachypodium distachyon", "bbox": [68, 10, 88, 28], "px_per_mm": 11.8, "marker_type": "astrocalibration_v2"}
{"file_name": "train/img_003.jpg", "species": "Solanum lycopersicum", "bbox": [50, 62, 72, 82], "px_per_mm": 16.5, "marker_type": "astrocalibration_v2"}
{"file_name": "train/img_004.jpg", "species": "Oryza sativa", "bbox": [8, 8, 28, 25], "px_per_mm": 13.0, "marker_type": "astrocalibration_v2"}
`;

  const plantCvRunnerScript = `# PlantCV & AstroBotany Pipeline Integration Script
import plantcv.plantcv as pcv
import json

def process_astrobotany_dataset(image_path):
    # 1. Read Image
    img, path, filename = pcv.readimage(filename=image_path)
    
    # 2. Locate AstroBotany "astrocalibration" Marker
    target_matrix, mask, pcm = pcv.transform.get_color_matrix(
        rgb_img=img,
        target_type="astrocalibration_10mm",
        threshold="light"
    )
    
    # 3. Correct Image Colors
    calibrated_img = pcv.transform.correct_color(
        rgb_img=img,
        target_matrix=target_matrix,
        source_matrix=pcm
    )
    
    # 4. Measure Plant Root and Anthocyanin Phenotypes
    print("AstroBotany Calibration complete!")
    return calibrated_img

if __name__ == "__main__":
    process_astrobotany_dataset("sample_plant.jpg")
`;

  const copyText = (text: string, fileKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(fileKey);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
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
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 font-mono text-xs mb-1">
              <Share2 className="w-4 h-4" />
              <span>PHASE 4: COMMUNITY SHARING & PIPELINE EXPORT</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              Hugging Face Datasets & PlantCV Exporter
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Export verified AstroBotany calibration datasets in standardized Hugging Face dataset format and generate python scripts for seamless PlantCV, AstroRoot, and Anthocyanin pipeline integration.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => downloadFile(hfReadmeContent, 'README.md', 'text/markdown')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-md shadow-blue-900/30 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download HF Dataset Bundle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Code Snippets & Files */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HF README.md Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-xs text-slate-200 font-mono">README.md (Hugging Face Hub)</h3>
            </div>

            <button
              onClick={() => copyText(hfReadmeContent, 'readme')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium flex items-center space-x-1"
            >
              {copiedFile === 'readme' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFile === 'readme' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <pre className="bg-slate-950 p-3 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed border border-slate-800 h-64">
            <code>{hfReadmeContent}</code>
          </pre>
        </div>

        {/* HF metadata.jsonl */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-teal-400" />
              <h3 className="font-bold text-xs text-slate-200 font-mono">metadata.jsonl (Annotations)</h3>
            </div>

            <button
              onClick={() => copyText(hfMetadataJsonl, 'jsonl')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium flex items-center space-x-1"
            >
              {copiedFile === 'jsonl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFile === 'jsonl' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <pre className="bg-slate-950 p-3 rounded-lg text-[11px] font-mono text-teal-300/90 overflow-x-auto leading-relaxed border border-slate-800 h-64">
            <code>{hfMetadataJsonl}</code>
          </pre>
        </div>
      </div>

      {/* PlantCV Integration Python Script */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-xs text-slate-200 font-mono">
              astrobotany_plantcv_pipeline.py (Python Integration Script)
            </h3>
          </div>

          <button
            onClick={() => copyText(plantCvRunnerScript, 'script')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium flex items-center space-x-1"
          >
            {copiedFile === 'script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedFile === 'script' ? 'Copied' : 'Copy Python Code'}</span>
          </button>
        </div>

        <pre className="bg-slate-950 p-4 rounded-lg text-[11px] font-mono text-emerald-300/90 overflow-x-auto leading-relaxed border border-slate-800">
          <code>{plantCvRunnerScript}</code>
        </pre>
      </div>
    </div>
  );
};
