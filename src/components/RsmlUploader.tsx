import React, { useState, useEffect } from 'react';
import { Upload, Trash2, ExternalLink, FileCode, Check, Loader2 } from 'lucide-react';
import { saveRsml, getProjectRsmls, deleteProjectRsmls } from '../lib/idb';
import { putResult } from '../lib/cose-results';
import type { Ec5Entry } from '../types';

interface Props {
  projectSlug: string;
  entries?: Ec5Entry[];
}

export async function deleteAstroRootResult(ref: string): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('cose-analysis', 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const id = `${ref}::astroroot`;
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction('results', 'readwrite');
    t.objectStore('results').delete(id);
    t.oncomplete = () => { db.close(); resolve(); };
    t.onerror = () => reject(t.error);
  });
}

export function parseRsmlText(text: string, filename: string) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) return null;

    const unitEl = doc.getElementsByTagName('unit')[0];
    const unit = unitEl ? unitEl.textContent?.trim().toLowerCase() || 'pixel' : 'pixel';
    const resEl = doc.getElementsByTagName('resolution')[0];
    const res = resEl ? parseFloat(resEl.textContent || '1') || 1 : 1;

    const UNIT_CM: Record<string, number | null> = {
      cm: 1,
      mm: 0.1,
      inch: 2.54,
      pixel: null,
      px: null
    };
    const toCm = UNIT_CM[unit];
    const dispUnit = toCm != null ? 'cm' : 'px';
    const k = toCm != null ? toCm / res : 1;

    const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const roots: { order: number; pts: [number, number][]; len: number }[] = [];

    const rootPoints = (rootEl: Element): [number, number][] => {
      const geo = [...rootEl.children].find(c => c.tagName.toLowerCase() === 'geometry');
      if (!geo) return [];
      const poly = [...geo.children].find(c => c.tagName.toLowerCase() === 'polyline');
      if (!poly) return [];
      return [...poly.getElementsByTagName('point')].map(pt => [
        parseFloat(pt.getAttribute('x') || '0'),
        parseFloat(pt.getAttribute('y') || '0')
      ]);
    };

    const collectRoots = (el: Element, order: number) => {
      for (const r of [...el.children].filter(c => c.tagName.toLowerCase() === 'root')) {
        const pts = rootPoints(r);
        if (pts.length >= 2) {
          let len = 0;
          for (let idx = 1; idx < pts.length; idx++) {
            len += dist(pts[idx - 1], pts[idx]);
          }
          roots.push({ order, pts, len });
          collectRoots(r, order + 1);
        } else {
          collectRoots(r, order + 1);
        }
      }
    };

    const plantEls = doc.getElementsByTagName('plant');
    for (let idx = 0; idx < plantEls.length; idx++) {
      collectRoots(plantEls[idx], 1);
    }

    if (roots.length === 0) return null;

    const TRL = roots.reduce((sum, r) => sum + r.len, 0);
    const primaryRoots = roots.filter(r => r.order === 1);
    const lateralRoots = roots.filter(r => r.order >= 2);
    const TLRL = lateralRoots.reduce((sum, r) => sum + r.len, 0);

    const tips = roots.length; 
    const branches = lateralRoots.length;

    let totalAngle = 0;
    let angleCount = 0;
    primaryRoots.forEach(r => {
      const p = r.pts;
      if (p.length >= 2) {
        const dx = p[p.length - 1][0] - p[0][0];
        const dy = p[p.length - 1][1] - p[0][1];
        const len = Math.hypot(dx, dy);
        if (len > 1e-9) {
          const deg = Math.acos(Math.max(-1, Math.min(1, dy / len))) * 180 / Math.PI;
          totalAngle += Math.min(deg, 180 - deg);
          angleCount++;
        }
      }
    });
    const avgAngle = angleCount > 0 ? totalAngle / angleCount : 0;

    return {
      name: filename.replace(/\.rsml$/i, ''),
      engine: 'SmartRoot RSML Linker',
      generatedAt: new Date().toISOString(),
      metrics: {
        'Total Root Length (TRL)': `${(TRL * k).toFixed(2)} ${dispUnit}`,
        'Primary Root Length': `${(primaryRoots.reduce((sum, r) => sum + r.len, 0) * k).toFixed(2)} ${dispUnit}`,
        'Lateral Root Length': `${(TLRL * k).toFixed(2)} ${dispUnit}`,
        'Lateral Root Count': branches,
        'Root Tip Count (Tips)': tips,
        'Max Branching Order': Math.max(...roots.map(r => r.order)),
        'Average Primary Angle': `${avgAngle.toFixed(1)}°`
      }
    };
  } catch (err) {
    console.error('Error parsing RSML xml content', err);
    return null;
  }
}

export function parseRsmlMeta(filename: string) {
  const clean = filename.replace(/\.rsml$/i, '');
  const parts = clean.split(/[_-]/);
  let condition = 'Control';
  let genotype = 'Col-0';
  let day = '';

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

export const RsmlUploader: React.FC<Props> = ({ projectSlug, entries }) => {
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

  useEffect(() => {
    if (!entries || entries.length === 0 || rsmls.length === 0) return;

    const linkTraces = async () => {
      const imagesByKey: Record<string, Ec5Entry[]> = {};
      entries.forEach(e => {
        const nameLower = e.title.toLowerCase();
        
        let treat = '';
        if (nameLower.includes('_fl_')) treat = 'FL';
        else if (nameLower.includes('_gr_')) treat = 'GR';

        let cond = '';
        if (nameLower.includes('_dark_')) cond = 'dark';
        else if (nameLower.includes('_ambient_')) cond = 'ambient';

        let geno = '';
        if (nameLower.includes('_col-0-phyd_') || nameLower.includes('_phyd_')) geno = 'PhyD';
        else if (nameLower.includes('_ws_')) geno = 'Ws';
        else if (nameLower.includes('_col-0_') || nameLower.includes('_col_')) geno = 'Col';

        let day = '';
        const dayMatch = nameLower.match(/_d(\d+)_/);
        if (dayMatch) day = `d${parseInt(dayMatch[1], 10)}`;

        if (treat && cond && geno && day) {
          const key = `${treat}::${cond}::${geno}::${day}`;
          if (!imagesByKey[key]) imagesByKey[key] = [];
          imagesByKey[key].push(e);
        }
      });

      Object.keys(imagesByKey).forEach(k => {
        imagesByKey[k].sort((a, b) => a.title.localeCompare(b.title));
      });

      const rsmlsByKey: Record<string, typeof rsmls> = {};
      rsmls.forEach(r => {
        const clean = r.filename.replace(/\.rsml$/i, '');
        const parts = clean.split(/[_-]/);
        if (parts.length >= 4) {
          const first = parts[0].toUpperCase();
          const second = parts[1].toLowerCase();
          const treat = first.startsWith('FL') ? 'FL' : first.startsWith('GR') ? 'GR' : '';
          const cond = second.startsWith('dark') ? 'dark' : second.startsWith('light') || second.startsWith('ambient') ? 'ambient' : '';
          
          let geno = '';
          let dayStr = '';

          if (/^plate\d+/i.test(parts[2])) {
            geno = parts[3];
            dayStr = parts[4] || '';
          } else {
            geno = parts[2];
            dayStr = parts[3] || '';
          }

          const genotype = /phyd/i.test(geno) ? 'PhyD' : /ws/i.test(geno) ? 'Ws' : /col/i.test(geno) ? 'Col' : '';
          const dayNum = parseInt(dayStr.replace(/\D/g, ''), 10);
          const day = !isNaN(dayNum) ? (dayNum === 11 ? 'd13' : `d${String(dayNum).padStart(2, '0')}`) : '';

          if (treat && cond && genotype && day) {
            const key = `${treat}::${cond}::${genotype}::${day}`;
            if (!rsmlsByKey[key]) rsmlsByKey[key] = [];
            rsmlsByKey[key].push(r);
          }
        }
      });

      Object.keys(rsmlsByKey).forEach(k => {
        rsmlsByKey[k].sort((a, b) => a.filename.localeCompare(b.filename));
      });

      let updated = false;
      for (const [key, groupRsmls] of Object.entries(rsmlsByKey)) {
        const groupImages = imagesByKey[key];
        if (!groupImages || groupImages.length === 0) continue;

        for (let idx = 0; idx < groupRsmls.length; idx++) {
          const r = groupRsmls[idx];
          const img = groupImages[Math.min(idx, groupImages.length - 1)];
          const ref = `${img.project}::${img.uuid}`;
          
          const parsed = parseRsmlText(r.content, r.filename);
          if (parsed) {
            await putResult({
              ref,
              imageUrl: img.photoUrl || '',
              tool: 'astroroot',
              toolName: 'AstroRoot',
              metrics: parsed.metrics,
              generatedAt: parsed.generatedAt
            });
            updated = true;
          }
        }
      }

      if (updated) {
        window.dispatchEvent(new Event('focus'));
      }
    };

    linkTraces().catch(err => console.error('Failed linking local RSML traces', err));
  }, [rsmls, entries]);

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
      if (entries) {
        for (const e of entries) {
          const ref = `${e.project}::${e.uuid}`;
          await deleteAstroRootResult(ref);
        }
      }
      await deleteProjectRsmls(projectSlug);
      await loadRsmls();
      window.dispatchEvent(new Event('focus'));
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handleLaunchAstroRoot = () => {
    if (rsmls.length === 0) return;

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

