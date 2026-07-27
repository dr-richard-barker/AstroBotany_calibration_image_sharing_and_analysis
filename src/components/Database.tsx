import React, { useMemo, useState } from 'react';
import { Database as DbIcon, CheckCircle2, Images, Loader2, ChevronDown } from 'lucide-react';
import type { Ec5Entry, MarkerAnalysis } from '../types';
import { MarkerInspector } from './MarkerInspector';

interface Props {
  entries: Ec5Entry[];
  slug: string;
  query: string;
  loading: boolean;
  hasNext: boolean;
  onLoadMore: () => void;
  onMarkerChanged: (uuid: string, marker: MarkerAnalysis | null) => void;
}

type Filter = 'all' | 'analyzed' | 'unanalyzed';

export const Database: React.FC<Props> = ({ entries, slug, query, loading, hasNext, onLoadMore, onMarkerChanged }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(e => {
      if (filter === 'analyzed' && !e.marker?.markerFound) return false;
      if (filter === 'unanalyzed' && e.marker?.markerFound) return false;
      if (!q) return true;
      return [e.title, e.species, ...e.fields.map(f => f.value)].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [entries, query, filter]);

  const selected = filtered.find(e => e.uuid === selectedId) || null;
  const analyzed = entries.filter(e => e.marker?.markerFound).length;

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Shared collection</div>
        <h1>Calibration image database</h1>
        <p>Photos contributed to the Epicollect5 project, read live from its open API. Select one to detect the calibration marker and measure scale &amp; colour — analysis runs in your browser and is cached locally.</p>
      </div>

      <div className="row wrap sb" style={{ marginBottom: 14, gap: 10 }}>
        <div className="row" style={{ gap: 6 }}>
          {([['all', 'All', entries.length], ['analyzed', 'Analyzed', analyzed], ['unanalyzed', 'Not analyzed', entries.length - analyzed]] as const).map(([k, label, n]) => (
            <button key={k} className={`btn btn-sm ${filter === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(k as Filter)}>
              {k === 'analyzed' ? <CheckCircle2 /> : <Images />} {label} ({n})
            </button>
          ))}
        </div>
        <span className="muted" style={{ fontSize: '.82rem' }}>{filtered.length} shown</span>
      </div>

      {entries.length === 0 && !loading ? (
        <div className="card empty">
          <DbIcon size={30} style={{ opacity: .5 }} />
          <p>No entries found for this project. Check the project name in the top bar, or open <strong>Contribute</strong> to add photos via the Epicollect5 app.</p>
        </div>
      ) : (
        <>
          <div className="grid" style={{ gridTemplateColumns: selected ? 'minmax(0, 1.15fr) minmax(0, 1fr)' : '1fr', alignItems: 'start' }}>
            <div className="gallery">
              {filtered.map(e => (
                <div key={e.uuid} className={`tile ${selectedId === e.uuid ? 'sel' : ''}`} onClick={() => setSelectedId(e.uuid)}>
                  <div className="thumb">
                    {e.thumbUrl ? <img src={e.thumbUrl} alt={e.title} loading="lazy" crossOrigin="anonymous" />
                      : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--muted)', fontSize: '.7rem' }}>no photo</div>}
                    <div className="corner-badge">
                      {e.marker?.markerFound ? <span className="badge pos"><CheckCircle2 size={11} /> marker</span> : e.marker ? <span className="badge neg">no marker</span> : null}
                    </div>
                    {e.marker?.markerFound && e.marker.pxPerMm ? <div className="scale-badge">{e.marker.pxPerMm.toFixed(1)} px/mm</div> : null}
                  </div>
                  <div className="meta">
                    <h4>{e.title}</h4>
                    <div className="sp">{e.species || (e.fields[0]?.value ?? '')}</div>
                  </div>
                </div>
              ))}
            </div>

            {selected && (
              <div style={{ position: 'sticky', top: 74 }}>
                <MarkerInspector entry={selected} slug={slug} onMarkerChanged={onMarkerChanged} />
              </div>
            )}
          </div>

          <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
            {loading ? <span className="row muted" style={{ gap: 8 }}><Loader2 className="spin" size={16} /> Loading…</span>
              : hasNext ? <button className="btn btn-sm" onClick={onLoadMore}><ChevronDown /> Load more</button>
              : entries.length > 0 ? <span className="muted" style={{ fontSize: '.8rem' }}>End of collection</span> : null}
          </div>
        </>
      )}
    </div>
  );
};
