import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, Scale, RotateCw, Sparkles, Save, Edit3, Loader2, Trash2, MapPin, Camera } from 'lucide-react';
import type { ImageRecord, MarkerAnalysis, Pt } from '../types';
import { toImageData } from '../lib/capture';
import { analyzeMarker, analyzeFromQuad } from '../lib/detect';
import { updateMarker, deleteImage } from '../api/client';
import { QuadAnnotator } from './QuadAnnotator';

interface Props {
  rec: ImageRecord;
  onSaved: (rec: ImageRecord) => void;
  onDeleted: (id: string) => void;
}

const rgb = (c: [number, number, number]) => `rgb(${c[0]},${c[1]},${c[2]})`;
const DEFAULT_QUAD: [Pt, Pt, Pt, Pt] = [
  { x: 0.35, y: 0.35 }, { x: 0.65, y: 0.35 }, { x: 0.65, y: 0.6 }, { x: 0.35, y: 0.6 },
];

export const MarkerInspector: React.FC<Props> = ({ rec, onSaved, onDeleted }) => {
  const [imgData, setImgData] = useState<ImageData | null>(null);
  const [marker, setMarker] = useState<MarkerAnalysis | null>(rec.marker);
  const [busy, setBusy] = useState<string | null>(null);
  const [annotate, setAnnotate] = useState(false);
  const [quad, setQuad] = useState<[Pt, Pt, Pt, Pt]>(DEFAULT_QUAD);
  const [dirty, setDirty] = useState(false);
  const dims = useRef<{ w: number; h: number }>({ w: rec.width, h: rec.height });

  useEffect(() => {
    setMarker(rec.marker);
    setAnnotate(false);
    setDirty(false);
    setImgData(null);
    let alive = true;
    (async () => {
      try {
        const blob = await (await fetch(rec.url)).blob();
        const id = await toImageData(blob);
        if (!alive) return;
        dims.current = { w: id.width, h: id.height };
        setImgData(id);
        if (rec.marker?.corners) setQuad(cornersToFrac(rec.marker.corners, id.width, id.height));
      } catch { /* image failed to load */ }
    })();
    return () => { alive = false; };
  }, [rec.id]);

  const runDetect = async (skipGeometric = false) => {
    if (!imgData) return;
    setBusy('detect');
    try {
      const m = await analyzeMarker(imgData, { skipGeometric });
      setMarker(m);
      setDirty(true);
      if (m.corners) setQuad(cornersToFrac(m.corners, dims.current.w, dims.current.h));
    } finally { setBusy(null); }
  };

  const recomputeFromQuad = () => {
    if (!imgData) return;
    const px = quad.map(p => ({ x: p.x * dims.current.w, y: p.y * dims.current.h })) as [Pt, Pt, Pt, Pt];
    setMarker(analyzeFromQuad(imgData, px));
    setDirty(true);
  };

  const save = async () => {
    if (!marker) return;
    setBusy('save');
    try { onSaved(await updateMarker(rec.id, marker)); setDirty(false); }
    finally { setBusy(null); }
  };

  const remove = async () => {
    setBusy('delete');
    try { await deleteImage(rec.id); onDeleted(rec.id); }
    finally { setBusy(null); }
  };

  const overlayQuad = marker?.corners ? cornersToFrac(marker.corners, dims.current.w, dims.current.h) : null;
  const md = rec.metadata || {};

  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr)', gap: 16 }}>
      {/* image + overlay / annotator */}
      <div className="card pad">
        <div className="card-title sb" style={{ justifyContent: 'space-between' }}>
          <span className="row" style={{ gap: 8 }}><Crosshair /> {annotate ? 'Place the 4 marker corners' : 'Marker analysis'}</span>
          <button className="btn btn-sm btn-ghost" onClick={() => setAnnotate(a => !a)}>
            <Edit3 /> {annotate ? 'Done placing' : 'Adjust manually'}
          </button>
        </div>

        {annotate ? (
          <>
            <QuadAnnotator imageUrl={rec.url} quad={quad} onChange={q => setQuad(q)} />
            <div className="row" style={{ marginTop: 10, gap: 8 }}>
              <button className="btn btn-teal btn-sm" onClick={recomputeFromQuad}>
                <Scale /> Compute scale &amp; colour from these corners
              </button>
              <span className="muted" style={{ fontSize: '.78rem' }}>Order: top-left, top-right, bottom-right, bottom-left.</span>
            </div>
          </>
        ) : (
          <div style={{ position: 'relative' }}>
            <img src={rec.url} alt={rec.title} style={{ display: 'block', width: '100%', borderRadius: 8 }} />
            {overlayQuad && (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <polygon points={overlayQuad.map(p => `${p.x * 100},${p.y * 100}`).join(' ')}
                  fill="color-mix(in srgb, var(--accent2) 18%, transparent)"
                  stroke="var(--accent2)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
              </svg>
            )}
            {!imgData && (
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.25)', borderRadius: 8 }}>
                <Loader2 className="spin" color="#fff" />
              </div>
            )}
          </div>
        )}

        <div className="row wrap" style={{ marginTop: 12, gap: 8 }}>
          <button className="btn btn-primary btn-sm" disabled={!imgData || busy === 'detect'} onClick={() => runDetect(false)}>
            {busy === 'detect' ? <Loader2 className="spin" /> : <Sparkles />} Detect marker
          </button>
          <button className="btn btn-sm btn-ghost" disabled={!imgData || busy === 'detect'} onClick={() => runDetect(true)} title="Force the ArUco decoder (for the ArUco target demo image)">
            ArUco decoder
          </button>
          {dirty && (
            <button className="btn btn-teal btn-sm" disabled={busy === 'save'} onClick={save}>
              {busy === 'save' ? <Loader2 className="spin" /> : <Save />} Save analysis
            </button>
          )}
          <span className="grow" />
          <button className="btn btn-sm btn-ghost" disabled={busy === 'delete'} onClick={remove} title="Remove from database" style={{ color: 'var(--danger)' }}>
            <Trash2 />
          </button>
        </div>
      </div>

      {/* measured metrics */}
      <div className="card pad">
        <div className="card-title"><Scale /> Calibration &amp; colour</div>
        {marker?.markerFound ? (
          <>
            <div className="stat-row" style={{ marginBottom: 14 }}>
              <div className="stat"><div className="k">Scale</div><div className="v accent">{marker.pxPerMm?.toFixed(2)}<span style={{ fontSize: '.8rem' }}> px/mm</span></div></div>
              <div className="stat"><div className="k"><RotateCw size={11} style={{ verticalAlign: -1 }} /> Rotation</div><div className="v">{marker.rotationDeg?.toFixed(1)}°</div></div>
              <div className="stat"><div className="k">Corners found</div><div className="v teal">{marker.cornersFound}/4</div></div>
              <div className="stat"><div className="k">Colour residual</div><div className="v">{marker.colorResidualRms?.toFixed(3)}</div></div>
            </div>
            <div className="muted" style={{ fontSize: '.78rem', marginBottom: 8 }}>
              Detector: <span className="mono">{marker.detector}</span> · 15-chip Astrobotany reference (measured vs. standard)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(84px,1fr))', gap: 8 }}>
              {marker.colorChips.map((c, i) => (
                <div key={i} className="mono" style={{ fontSize: '.66rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', height: 26, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--line)' }}>
                    <div style={{ flex: 1, background: rgb(c.measured) }} title={`measured ${rgb(c.measured)}`} />
                    <div style={{ flex: 1, background: rgb(c.standard) }} title={`standard ${rgb(c.standard)}`} />
                  </div>
                  <div className="muted" style={{ marginTop: 3 }}>{c.name}</div>
                </div>
              ))}
            </div>
          </>
        ) : marker ? (
          <p className="muted" style={{ fontSize: '.86rem' }}>
            No calibration marker detected ({marker.cornersFound}/4 corners). Use <strong>Adjust manually</strong> to place the four corners over the card, then compute the scale.
          </p>
        ) : (
          <p className="muted" style={{ fontSize: '.86rem' }}>Run <strong>Detect marker</strong> to measure the scale and colour calibration from the Astrobotany card in this photo.</p>
        )}
      </div>

      {/* metadata */}
      <div className="card pad">
        <div className="card-title"><Camera /> Image &amp; device metadata</div>
        <dl className="kv">
          <dt>Species</dt><dd>{rec.species || '—'}</dd>
          <dt>Contributor</dt><dd>{rec.contributor || '—'}</dd>
          <dt>Source</dt><dd>{rec.source}{rec.sourceRef ? ` · ${rec.sourceRef}` : ''}</dd>
          <dt>License</dt><dd>{rec.license || '—'}</dd>
          <dt>Stored size</dt><dd>{rec.width}×{rec.height} · {(rec.fileSize / 1024).toFixed(0)} KB</dd>
          {rec.origWidth ? <><dt>Original size</dt><dd>{rec.origWidth}×{rec.origHeight}{rec.origFileSize ? ` · ${(rec.origFileSize / 1024).toFixed(0)} KB` : ''}</dd></> : null}
          {rec.capturedAt ? <><dt>Captured</dt><dd>{new Date(rec.capturedAt).toLocaleString()}</dd></> : null}
          <dt>Uploaded</dt><dd>{new Date(rec.uploadedAt).toLocaleString()}</dd>
          {md.make || md.model ? <><dt>Device</dt><dd>{[md.make, md.model].filter(Boolean).join(' ')}</dd></> : null}
          {md.focalLength ? <><dt>Lens</dt><dd>{md.focalLength}mm{md.fNumber ? ` · ƒ/${md.fNumber}` : ''}{md.iso ? ` · ISO ${md.iso}` : ''}</dd></> : null}
          {md.gpsLatitude != null ? <><dt><MapPin size={11} style={{ verticalAlign: -1 }} /> GPS</dt><dd>{md.gpsLatitude.toFixed(5)}, {md.gpsLongitude?.toFixed(5)}</dd></> : null}
        </dl>
        {rec.notes && <p style={{ fontSize: '.85rem', marginTop: 12 }}>{rec.notes}</p>}
        {rec.tags?.length ? (
          <div className="row wrap" style={{ gap: 6, marginTop: 12 }}>
            {rec.tags.map((t, i) => <span key={i} className="chip tag">{t}</span>)}
          </div>
        ) : null}
      </div>
    </div>
  );
};

function cornersToFrac(corners: { x: number; y: number }[], w: number, h: number): [Pt, Pt, Pt, Pt] {
  const f = corners.map(p => ({ x: p.x / w, y: p.y / h }));
  return [f[0], f[1], f[2], f[3]] as [Pt, Pt, Pt, Pt];
}
