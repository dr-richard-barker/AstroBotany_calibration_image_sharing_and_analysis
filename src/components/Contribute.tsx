import React, { useRef, useState } from 'react';
import {
  UploadCloud, Camera, Loader2, CheckCircle2, X, ImagePlus, FolderInput, Sparkles, Gauge, MapPin,
} from 'lucide-react';
import type { ImageRecord, MarkerAnalysis } from '../types';
import { prepareImage, toImageData, humanBytes, type PreparedImage } from '../lib/capture';
import { analyzeMarker } from '../lib/detect';
import { uploadImage, ingestGooglePhotos, type IngestResult } from '../api/client';

interface Props {
  onAdded: (recs: ImageRecord[]) => void;
}

interface QueueItem {
  id: string;
  file: File;
  title: string;
  prepared?: PreparedImage;
  marker?: MarkerAnalysis | null;
  status: 'preparing' | 'ready' | 'uploading' | 'done' | 'error';
  error?: string;
}

const MAX_EDGES = [1024, 2048, 3072];
const QUALITIES = [0.7, 0.82, 0.9];

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]+,/, ''));
    r.onerror = () => reject(new Error('read failed'));
    r.readAsDataURL(blob);
  });
}

let seq = 0;

export const Contribute: React.FC<Props> = ({ onAdded }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [maxEdge, setMaxEdge] = useState(2048);
  const [quality, setQuality] = useState(0.82);
  const [species, setSpecies] = useState('');
  const [contributor, setContributor] = useState('');
  const [license, setLicense] = useState('CC-BY 4.0');
  const [tagsText, setTagsText] = useState('');
  const [hot, setHot] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  // Google Photos
  const [albumUrl, setAlbumUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [ingest, setIngest] = useState<IngestResult | null>(null);

  const addFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    const items: QueueItem[] = arr.map(f => ({ id: `q${seq++}`, file: f, title: f.name.replace(/\.[^.]+$/, ''), status: 'preparing' }));
    setQueue(q => [...items, ...q]);
    for (const it of items) {
      try {
        const prepared = await prepareImage(it.file, { maxEdge, quality });
        let marker: MarkerAnalysis | null = null;
        try { marker = await analyzeMarker(await toImageData(prepared.blob)); } catch { marker = null; }
        setQueue(q => q.map(x => x.id === it.id ? { ...x, prepared, marker, status: 'ready' } : x));
      } catch (e) {
        setQueue(q => q.map(x => x.id === it.id ? { ...x, status: 'error', error: e instanceof Error ? e.message : String(e) } : x));
      }
    }
  };

  const removeItem = (id: string) => setQueue(q => q.filter(x => x.id !== id));

  const uploadAll = async () => {
    const ready = queue.filter(x => x.status === 'ready' && x.prepared);
    if (!ready.length) return;
    setUploading(true);
    const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean);
    const done: ImageRecord[] = [];
    for (const it of ready) {
      setQueue(q => q.map(x => x.id === it.id ? { ...x, status: 'uploading' } : x));
      try {
        const rec = await uploadImage({
          imageBase64: await blobToBase64(it.prepared!.blob),
          mime: 'image/jpeg',
          width: it.prepared!.width, height: it.prepared!.height,
          origWidth: it.prepared!.origWidth, origHeight: it.prepared!.origHeight,
          origFileSize: it.prepared!.origFileSize,
          title: it.title, species, contributor, license, tags,
          source: 'upload', sourceRef: it.file.name,
          capturedAt: it.prepared!.capturedAt, metadata: it.prepared!.metadata, marker: it.marker,
        });
        done.push(rec);
        setQueue(q => q.map(x => x.id === it.id ? { ...x, status: 'done' } : x));
      } catch (e) {
        setQueue(q => q.map(x => x.id === it.id ? { ...x, status: 'error', error: e instanceof Error ? e.message : String(e) } : x));
      }
    }
    setUploading(false);
    if (done.length) {
      onAdded(done);
      setToast(`Added ${done.length} image${done.length > 1 ? 's' : ''} to the database`);
      setTimeout(() => setToast(null), 3000);
      setTimeout(() => setQueue(q => q.filter(x => x.status !== 'done')), 1200);
    }
  };

  const runImport = async () => {
    if (!albumUrl.trim()) return;
    setImporting(true); setIngest(null);
    try {
      const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean);
      const result = await ingestGooglePhotos(albumUrl.trim(), { contributor, species, license, tags });
      setIngest(result);
      if (result.imported.length) {
        onAdded(result.imported);
        setToast(`Imported ${result.imported.length} photos from Google Photos`);
        setTimeout(() => setToast(null), 3000);
      }
    } catch (e) {
      setIngest({ albumTitle: null, found: 0, imported: [], skipped: 0, errors: [e instanceof Error ? e.message : String(e)] });
    } finally { setImporting(false); }
  };

  const readyCount = queue.filter(x => x.status === 'ready').length;

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Contribute</div>
        <h1>Add photos to the database</h1>
        <p>Snap or upload a photo of an organism or experiment next to the Astrobotany calibration marker. Metadata is read on your device, the image is compressed for storage, and the marker is detected automatically — all before anything is sent.</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', alignItems: 'start' }}>
        {/* left: capture */}
        <div className="grid" style={{ gap: 16 }}>
          <div
            className={`dropzone ${hot ? 'hot' : ''}`}
            onDragOver={e => { e.preventDefault(); setHot(true); }}
            onDragLeave={() => setHot(false)}
            onDrop={e => { e.preventDefault(); setHot(false); if (e.dataTransfer.files) addFiles(e.dataTransfer.files); }}
          >
            <UploadCloud />
            <p style={{ margin: '10px 0 4px', fontWeight: 600 }}>Drop photos here, or</p>
            <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}><ImagePlus /> Choose files</button>
              <button className="btn btn-sm" onClick={() => camRef.current?.click()}><Camera /> Use camera</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => e.target.files && addFiles(e.target.files)} />
            <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={e => e.target.files && addFiles(e.target.files)} />
            <div className="row" style={{ justifyContent: 'center', gap: 14, marginTop: 12, fontSize: '.76rem' }}>
              <label className="row" style={{ gap: 6 }}><Gauge size={13} /> Max edge
                <select className="select" style={{ width: 'auto', padding: '3px 6px' }} value={maxEdge} onChange={e => setMaxEdge(Number(e.target.value))}>
                  {MAX_EDGES.map(m => <option key={m} value={m}>{m}px</option>)}
                </select>
              </label>
              <label className="row" style={{ gap: 6 }}>Quality
                <select className="select" style={{ width: 'auto', padding: '3px 6px' }} value={quality} onChange={e => setQuality(Number(e.target.value))}>
                  {QUALITIES.map(q => <option key={q} value={q}>{Math.round(q * 100)}%</option>)}
                </select>
              </label>
            </div>
          </div>

          {queue.length > 0 && (
            <div className="card pad">
              <div className="card-title sb" style={{ justifyContent: 'space-between' }}>
                <span className="row" style={{ gap: 8 }}><Sparkles /> Queue ({queue.length})</span>
                <button className="btn btn-primary btn-sm" disabled={!readyCount || uploading} onClick={uploadAll}>
                  {uploading ? <Loader2 className="spin" /> : <UploadCloud />} Upload {readyCount || ''}
                </button>
              </div>
              <div className="grid" style={{ gap: 10 }}>
                {queue.map(it => (
                  <div key={it.id} className="row" style={{ gap: 12, alignItems: 'flex-start', borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
                    <div style={{ width: 76, height: 60, borderRadius: 7, overflow: 'hidden', background: 'var(--bg)', flexShrink: 0, position: 'relative' }}>
                      {it.prepared ? <img src={it.prepared.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}><Loader2 className="spin" size={16} /></div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input className="input" style={{ padding: '5px 8px', fontSize: '.82rem' }} value={it.title}
                        onChange={e => setQueue(q => q.map(x => x.id === it.id ? { ...x, title: e.target.value } : x))} />
                      <div className="row wrap" style={{ gap: 8, marginTop: 5, fontSize: '.72rem' }}>
                        {it.prepared && <span className="mono muted">{humanBytes(it.prepared.origFileSize)} → {humanBytes(it.prepared.fileSize)} · {it.prepared.width}×{it.prepared.height}</span>}
                        {it.marker?.markerFound && <span className="badge pos"><CheckCircle2 size={10} /> {it.marker.pxPerMm?.toFixed(1)} px/mm</span>}
                        {it.marker && !it.marker.markerFound && <span className="badge neg">no marker</span>}
                        {it.prepared?.metadata.gpsLatitude != null && <span className="chip tag"><MapPin size={10} /> GPS</span>}
                        {it.status === 'done' && <span className="badge pos">saved</span>}
                        {it.status === 'error' && <span className="badge neg" title={it.error}>error</span>}
                      </div>
                    </div>
                    <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => removeItem(it.id)}><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* right: shared metadata + google photos */}
        <div className="grid" style={{ gap: 16 }}>
          <div className="card pad">
            <div className="card-title"><CheckCircle2 /> Shared details</div>
            <p className="muted" style={{ fontSize: '.78rem', marginTop: -6, marginBottom: 12 }}>Applied to every image you upload or import below.</p>
            <div className="field"><label>Species</label><input className="input" placeholder="e.g. Medicago truncatula" value={species} onChange={e => setSpecies(e.target.value)} /></div>
            <div className="field"><label>Contributor</label><input className="input" placeholder="Your name or lab" value={contributor} onChange={e => setContributor(e.target.value)} /></div>
            <div className="field"><label>License</label>
              <select className="select" value={license} onChange={e => setLicense(e.target.value)}>
                <option>CC-BY 4.0</option><option>CC-BY-SA 4.0</option><option>CC0 1.0</option><option>CC-BY-NC 4.0</option><option>All rights reserved</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}><label>Tags (comma-separated)</label><input className="input" placeholder="spaceflight, roots, APEX" value={tagsText} onChange={e => setTagsText(e.target.value)} /></div>
          </div>

          <div className="card pad">
            <div className="card-title"><FolderInput /> Import a Google Photos album</div>
            <p className="muted" style={{ fontSize: '.78rem', marginTop: -6, marginBottom: 12 }}>Paste a public shared-album link. Each photo is fetched, stored, and tagged with the shared details above.</p>
            <div className="field"><input className="input" placeholder="https://photos.app.goo.gl/…" value={albumUrl} onChange={e => setAlbumUrl(e.target.value)} /></div>
            <button className="btn btn-teal btn-sm" disabled={importing || !albumUrl.trim()} onClick={runImport}>
              {importing ? <Loader2 className="spin" /> : <FolderInput />} Import album
            </button>
            {ingest && (
              <div style={{ marginTop: 12, fontSize: '.8rem' }}>
                {ingest.imported.length > 0 && <div className="badge pos" style={{ marginBottom: 6 }}><CheckCircle2 size={11} /> Imported {ingest.imported.length} of {ingest.found}</div>}
                {ingest.albumTitle && <div className="muted">Album: {ingest.albumTitle}</div>}
                {ingest.skipped > 0 && <div className="muted">Skipped: {ingest.skipped}</div>}
                {ingest.errors.length > 0 && <div style={{ color: 'var(--danger)' }}>{ingest.errors.slice(0, 3).join('; ')}</div>}
                {ingest.imported.length === 0 && ingest.errors.length === 0 && <div className="muted">No photos found in that album link.</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
