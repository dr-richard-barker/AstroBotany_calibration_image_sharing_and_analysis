import React, { useEffect, useMemo, useState } from 'react';
import { Database as DbIcon, CheckCircle2, Images, ImageIcon, Loader2, ChevronDown, FileText, LineChart } from 'lucide-react';
import type { Ec5Entry, MarkerAnalysis } from '../types';
import { MarkerInspector } from './MarkerInspector';
import { projectName } from '../api/epicollect';
import { allResults } from '../lib/cose-results';

interface Props {
  entries: Ec5Entry[];
  query: string;
  loading: boolean;
  hasNext: boolean;
  showProject: boolean;
  onLoadMore: () => void;
  onMarkerChanged: (uuid: string, marker: MarkerAnalysis | null) => void;
}

type Filter = 'all' | 'withPhoto' | 'analyzed';

export const Database: React.FC<Props> = ({ entries, query, loading, hasNext, showProject, onLoadMore, onMarkerChanged }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [disabled, setDisabled] = useState<Set<string>>(new Set()); // projects toggled off
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Which images have tool results (ref -> count), from the shared store.
  const [resultCounts, setResultCounts] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    const load = () => allResults().then(rs => {
      const m = new Map<string, number>();
      for (const r of rs) m.set(r.ref, (m.get(r.ref) || 0) + 1);
      setResultCounts(m);
    }).catch(() => {});
    load();
    window.addEventListener('focus', load); // refresh after returning from a tool tab
    return () => window.removeEventListener('focus', load);
  }, []);

  const projectsInView = useMemo(() => [...new Set(entries.map(e => e.project))], [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(e => {
      if (disabled.has(e.project)) return false;
      if (filter === 'withPhoto' && !e.photoUrl) return false;
      if (filter === 'analyzed' && !e.marker?.markerFound) return false;
      if (!q) return true;
      return [e.title, e.species, ...e.fields.map(f => f.value)].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [entries, query, filter, disabled]);

  const selected = filtered.find(e => e.uuid === selectedId) || null;
  const withPhoto = entries.filter(e => e.photoUrl).length;
  const analyzed = entries.filter(e => e.marker?.markerFound).length;

  const toggleProject = (slug: string) =>
    setDisabled(prev => { const n = new Set(prev); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Shared collection</div>
        <h1>Calibration image database</h1>
        <p>Entries read live from the Epicollect5 project API. Filter to those with photos, then select one to detect the calibration marker and measure scale &amp; colour — analysis runs in your browser and is cached locally.</p>
      </div>

      <div className="row wrap sb" style={{ marginBottom: 12, gap: 10 }}>
        <div className="row wrap" style={{ gap: 6 }}>
          <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('all')}><Images /> All ({entries.length})</button>
          <button className={`btn btn-sm ${filter === 'withPhoto' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('withPhoto')}><ImageIcon /> With images ({withPhoto})</button>
          <button className={`btn btn-sm ${filter === 'analyzed' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('analyzed')}><CheckCircle2 /> Analyzed ({analyzed})</button>
        </div>
        <span className="muted" style={{ fontSize: '.82rem' }}>{filtered.length} shown</span>
      </div>

      {showProject && projectsInView.length > 1 && (
        <div className="row wrap" style={{ gap: 6, marginBottom: 14, alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: '.76rem', marginRight: 2 }}>Projects:</span>
          {projectsInView.map(slug => {
            const on = !disabled.has(slug);
            const n = entries.filter(e => e.project === slug).length;
            return (
              <button key={slug} onClick={() => toggleProject(slug)}
                className="chip" style={{
                  cursor: 'pointer',
                  background: on ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--card)',
                  color: on ? 'var(--accent)' : 'var(--muted)',
                  borderColor: on ? 'color-mix(in srgb, var(--accent) 40%, transparent)' : 'var(--line)',
                  opacity: on ? 1 : 0.6,
                }}>
                {on ? <CheckCircle2 size={12} /> : null} {projectName(slug)} ({n})
              </button>
            );
          })}
        </div>
      )}

      {entries.length === 0 && !loading ? (
        <div className="card empty">
          <DbIcon size={30} style={{ opacity: .5 }} />
          <p>No entries found. Choose a project from the top-bar selector, or add one in <strong>Contribute</strong>.</p>
        </div>
      ) : (
        <>
          <div className="grid" style={{ gridTemplateColumns: selected ? 'minmax(0, 1.15fr) minmax(0, 1fr)' : '1fr', alignItems: 'start' }}>
            <div className="gallery">
              {filtered.map(e => (
                <div key={e.uuid} className={`tile ${selectedId === e.uuid ? 'sel' : ''}`} onClick={() => setSelectedId(e.uuid)}>
                  <div className="thumb">
                    {e.thumbUrl ? <img src={e.thumbUrl} alt={e.title} loading="lazy" crossOrigin="anonymous" />
                      : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--muted)', gap: 4 }}>
                          <FileText size={22} style={{ opacity: .5 }} /><span style={{ fontSize: '.68rem' }}>metadata only</span>
                        </div>}
                    <div className="corner-badge">
                      {e.marker?.markerFound ? <span className="badge pos"><CheckCircle2 size={11} /> marker</span> : e.marker ? <span className="badge neg">no marker</span> : null}
                    </div>
                    {resultCounts.get(`${e.project}::${e.uuid}`) ? (
                      <div style={{ position: 'absolute', top: 7, right: 7 }}>
                        <span className="badge info" title="Tool analysis results attached"><LineChart size={11} /> {resultCounts.get(`${e.project}::${e.uuid}`)}</span>
                      </div>
                    ) : null}
                    {e.marker?.markerFound && e.marker.pxPerMm ? <div className="scale-badge">{e.marker.pxPerMm.toFixed(1)} px/mm</div> : null}
                  </div>
                  <div className="meta">
                    <h4>{e.title}</h4>
                    <div className="sp">{e.species || (e.fields[0]?.value ?? '')}</div>
                    {showProject && <div className="chip tag" style={{ marginTop: 6 }}>{projectName(e.project)}</div>}
                  </div>
                </div>
              ))}
            </div>

            {selected && (
              <div style={{ position: 'sticky', top: 74 }}>
                <MarkerInspector entry={selected} onMarkerChanged={onMarkerChanged} />
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
