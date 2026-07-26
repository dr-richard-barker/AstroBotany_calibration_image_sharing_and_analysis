import React, { useMemo, useState } from 'react';
import { Database as DbIcon, CheckCircle2, CircleSlash, Images } from 'lucide-react';
import type { ImageRecord } from '../types';
import { MarkerInspector } from './MarkerInspector';

interface Props {
  images: ImageRecord[];
  query: string;
  onSaved: (rec: ImageRecord) => void;
  onDeleted: (id: string) => void;
}

type MarkerFilter = 'all' | 'yes' | 'no';

export const Database: React.FC<Props> = ({ images, query, onSaved, onDeleted }) => {
  const [markerFilter, setMarkerFilter] = useState<MarkerFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return images.filter(img => {
      if (markerFilter === 'yes' && !img.marker?.markerFound) return false;
      if (markerFilter === 'no' && img.marker?.markerFound) return false;
      if (!q) return true;
      return [img.title, img.species, img.contributor, img.notes, ...(img.tags || [])]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [images, query, markerFilter]);

  const selected = filtered.find(i => i.id === selectedId) || null;
  const withMarker = images.filter(i => i.marker?.markerFound).length;

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Shared library</div>
        <h1>Calibration image database</h1>
        <p>Every image contributed to this instance, with its device metadata and any calibration-marker analysis. Select an image to detect the marker, adjust it, or read its metadata.</p>
      </div>

      <div className="row wrap sb" style={{ marginBottom: 14, gap: 10 }}>
        <div className="row" style={{ gap: 6 }}>
          {([['all', 'All', images.length], ['yes', 'With marker', withMarker], ['no', 'No marker', images.length - withMarker]] as const).map(([k, label, n]) => (
            <button key={k} className={`btn btn-sm ${markerFilter === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMarkerFilter(k as MarkerFilter)}>
              {k === 'yes' ? <CheckCircle2 /> : k === 'no' ? <CircleSlash /> : <Images />} {label} ({n})
            </button>
          ))}
        </div>
        <span className="muted" style={{ fontSize: '.82rem' }}>{filtered.length} shown</span>
      </div>

      {images.length === 0 ? (
        <div className="card empty">
          <DbIcon size={30} style={{ opacity: .5 }} />
          <p>No images yet. Head to <strong>Contribute</strong> to add a phone photo or import a Google Photos album.</p>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: selected ? 'minmax(0, 1.15fr) minmax(0, 1fr)' : '1fr', alignItems: 'start' }}>
          <div className="gallery">
            {filtered.map(img => (
              <div key={img.id} className={`tile ${selectedId === img.id ? 'sel' : ''}`} onClick={() => setSelectedId(img.id)}>
                <div className="thumb">
                  <img src={img.url} alt={img.title} loading="lazy" />
                  <div className="corner-badge">
                    {img.marker?.markerFound
                      ? <span className="badge pos"><CheckCircle2 size={11} /> marker</span>
                      : img.marker ? <span className="badge neg">no marker</span> : null}
                  </div>
                  {img.marker?.markerFound && img.marker.pxPerMm ? (
                    <div className="scale-badge">{img.marker.pxPerMm.toFixed(1)} px/mm</div>
                  ) : null}
                </div>
                <div className="meta">
                  <h4>{img.title}</h4>
                  <div className="sp">{img.species || img.contributor || img.source}</div>
                </div>
              </div>
            ))}
          </div>

          {selected && (
            <div style={{ position: 'sticky', top: 74 }}>
              <MarkerInspector
                rec={selected}
                onSaved={r => { onSaved(r); }}
                onDeleted={id => { onDeleted(id); setSelectedId(null); }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
