import React, { useState, useEffect } from 'react';
import { Upload, Trash2, ExternalLink, FileCode, Check, Loader2 } from 'lucide-react';
import { saveRsml, getProjectRsmls, deleteProjectRsmls } from '../lib/idb';

interface Props {
  projectSlug: string;
}

export function parseRsmlMeta(filename: string) {
  const clean = filename.replace(/\.rsml$/i, '');
  const parts = clean.split(/[_-]/);
  let condition = 'Control';
  let genotype = 'Col-0';
  let day = '';

  // Standard NASA/CARA pattern: Gr_Light_Plate1_WS_11, Fl_Dark_Plate2_Col_11
  // parts: ["Gr", "Light", "Plate1", "WS", "11"]
  if (parts.length >= 4) {
    const first = parts[0];
    const second = parts[1];
    if (/^(fl|gr|flight|ground)$/i.test(first) && /^(light|dark|control|treated)$/i.test(second)) {
      condition = `${first}_${second}`;
      if (/^plate\d+/i.test(parts[2])) {
        genotype = parts[3];
        if (parts[4]) day = parts[4];
      } else {
        genotype = parts[2];
        if (parts[3]) day = parts[3];
      }
    } else {
      condition = parts[0];
      genotype = parts[parts.length - 2];
      day = parts[parts.length - 1];
    }
  } else if (parts.length === 3) {
    condition = parts[0];
    genotype = parts[1];
    day = parts[2];
  } else if (parts.length === 2) {
    genotype = parts[0];
    day = parts[1];
  }

  // Prettify labels
  const condLabel = condition.replace(/^gr_/i, 'Ground · ').replace(/^fl_/i, 'Flight · ');
  const dayLabel = day ? ` (Day ${day})` : '';

  return { 
    name: clean, 
    condition: condLabel, 
    genotype,
    dayLabel,
    group: `${condLabel} · ${genotype}${dayLabel}`
  };
}

export const RsmlUploader: React.FC<Props> = ({ projectSlug }) => {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rsmls, setRsmls] = useState<{ filename: string; content: string }[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const loadRsmls = async () => {
    setLoading(true);
    try {
      const list = await getProjectRsmls(projectSlug);
      setRsmls(list);
    } catch (e) {
      console.error('Failed to load local RSML files', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRsmls();
  }, [projectSlug]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.name.toLowerCase().endsWith('.rsml')) continue;
        const text = await file.text();
        await saveRsml(projectSlug, file.name, text);
      }
      await loadRsmls();
    } catch (e) {
      alert('Error reading RSML files: ' + e);
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm(`Are you sure you want to delete all ${rsmls.length} local RSML traces for this project?`)) return;
    setBusy(true);
    try {
      await deleteProjectRsmls(projectSlug);
      await loadRsmls();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handleLaunchAstroRoot = () => {
    if (rsmls.length === 0) return;

    // Create Blob URLs for individual RSML traces
    const filesList = rsmls.map(r => {
      const blob = new Blob([r.content], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const meta = parseRsmlMeta(r.filename);
      return {
        file: r.filename,
        url: url,
        group: meta.group,
        name: meta.name,
        condition: meta.condition,
        genotype: meta.genotype
      };
    });

    // Compile into main rsml_index.json
    const indexJson = {
      name: `Local RSML uploads for ${projectSlug}`,
      description: `Locally uploaded SmartRoot RSML traces generated in-browser.`,
      count: filesList.length,
      files: filesList
    };

    const indexBlob = new Blob([JSON.stringify(indexJson, null, 2)], { type: 'application/json' });
    const indexBlobUrl = URL.createObjectURL(indexBlob);

    const astroUrl = `https://dr-richard-barker.github.io/astroroot/dashboard.html?rsml=${encodeURIComponent(indexBlobUrl)}`;
    window.open(astroUrl, '_blank');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="card pad" style={{ marginBottom: 14, borderColor: 'var(--accent)' }}>
      <div className="row wrap justify" style={{ alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: '1 1 300px' }}>
          <div className="row" style={{ gap: 8, marginBottom: 4 }}>
            <FileCode size={18} color="var(--accent)" />
            <h4 style={{ margin: 0, fontSize: '.9rem' }}>SmartRoot RSML Integration</h4>
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: '.8rem', color: 'var(--text-muted)' }}>
            Upload folders or files of <code>.rsml</code> root system traces to view them linked with the calibration images in the AstroRoot dashboard.
          </p>

          {loading ? (
            <div className="row" style={{ gap: 6, fontSize: '.78rem' }}><Loader2 className="spin" size={12} /> Loading stored traces…</div>
          ) : rsmls.length > 0 ? (
            <div className="row wrap" style={{ gap: 8, alignItems: 'center' }}>
              <span className="badge badge-teal" style={{ fontSize: '.74rem', padding: '3px 8px' }}>
                <Check size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} /> {rsmls.length} traces loaded locally
              </span>
              <button className="btn btn-sm btn-teal" onClick={handleLaunchAstroRoot}>
                Open in AstroRoot <ExternalLink size={12} style={{ marginLeft: 4 }} />
              </button>
              <button className="btn btn-danger btn-sm btn-icon" onClick={handleClear} disabled={busy} title="Clear uploaded traces">
                <Trash2 size={12} />
              </button>
            </div>
          ) : (
            <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No local RSML traces uploaded yet.
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 200px', width: '100%' }}>
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{
              border: dragActive ? '2px dashed var(--accent)' : '2px dashed var(--border)',
              borderRadius: 6,
              padding: '16px 10px',
              textAlign: 'center',
              backgroundColor: dragActive ? 'rgba(var(--accent-rgb), 0.05)' : 'var(--bg-card)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onClick={() => document.getElementById('rsml-file-input')?.click()}
          >
            <Upload size={22} style={{ color: 'var(--accent)', opacity: 0.8, marginBottom: 6 }} />
            <div style={{ fontSize: '.76rem', fontWeight: 600 }}>Drag RSML files/folder here</div>
            <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: 2 }}>or click to browse</div>
            
            <input
              id="rsml-file-input"
              type="file"
              accept=".rsml"
              multiple
              hidden
              disabled={busy}
              onChange={(e) => handleUpload(e.target.files)}
            />
          </div>
        </div>
      </div>

      {busy && (
        <div className="row" style={{ gap: 6, fontSize: '.78rem', marginTop: 10, color: 'var(--accent)' }}>
          <Loader2 className="spin" size={12} /> Processing trace folder…
        </div>
      )}
    </div>
  );
};
