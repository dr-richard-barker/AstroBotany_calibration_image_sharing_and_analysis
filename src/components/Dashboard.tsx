import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Loader2, Images, ImageIcon, Sprout, MapPin, CalendarRange, FolderTree, CheckCircle2 } from 'lucide-react';
import type { Ec5Entry } from '../types';
import { fetchAllComplete, getProjects, projectName } from '../api/epicollect';

// A palette derived from the CoSE accent pair, cycled for categorical series.
const PALETTE = ['#3b6ea5', '#3fb6a8', '#6a8ec2', '#57c2b4', '#8aa9cf', '#7bccc0', '#b7791f', '#9c6ea0'];

export const Dashboard: React.FC = () => {
  const [entries, setEntries] = useState<Ec5Entry[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [disabled, setDisabled] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    fetchAllComplete(getProjects().map(p => p.slug)).then(r => {
      if (!alive) return;
      setEntries(r.entries); setErrors(r.errors);
    });
    return () => { alive = false; };
  }, []);

  const projectsInData = useMemo(() => entries ? [...new Set(entries.map(e => e.project))] : [], [entries]);
  const data = useMemo(() => (entries || []).filter(e => !disabled.has(e.project)), [entries, disabled]);
  const toggle = (slug: string) => setDisabled(p => { const n = new Set(p); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });

  const agg = useMemo(() => computeAggregates(data), [data]);

  // Field explorer
  const [expProject, setExpProject] = useState<string>('');
  useEffect(() => { if (!expProject && projectsInData[0]) setExpProject(projectsInData[0]); }, [projectsInData, expProject]);
  const expFields = useMemo(() => fieldNames(data.filter(e => e.project === expProject)), [data, expProject]);
  const [expField, setExpField] = useState<string>('');
  useEffect(() => { if (expFields.length && !expFields.includes(expField)) setExpField(expFields[0]); }, [expFields, expField]);
  const expValues = useMemo(() => valueCounts(data.filter(e => e.project === expProject), expField), [data, expProject, expField]);

  if (!entries) {
    return <div className="empty"><Loader2 className="spin" /> <div style={{ marginTop: 10 }}>Loading all entries across projects…</div></div>;
  }

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Dashboard</div>
        <h1>Collection analytics</h1>
        <p>An overview of every entry across the connected Epicollect5 projects — {entries.length} entries. Toggle projects to focus the charts.</p>
      </div>

      {errors.length > 0 && <div className="card pad" style={{ marginBottom: 14, borderColor: 'var(--warn)', color: 'var(--warn)', fontSize: '.82rem' }}>{errors.map((e, i) => <div key={i}>{e}</div>)}</div>}

      {projectsInData.length > 1 && (
        <div className="row wrap" style={{ gap: 6, marginBottom: 16, alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: '.76rem' }}>Projects:</span>
          {projectsInData.map((slug, i) => {
            const on = !disabled.has(slug);
            return (
              <button key={slug} onClick={() => toggle(slug)} className="chip" style={{
                cursor: 'pointer', opacity: on ? 1 : 0.5,
                background: on ? `color-mix(in srgb, ${PALETTE[i % PALETTE.length]} 18%, transparent)` : 'var(--card)',
                color: on ? PALETTE[i % PALETTE.length] : 'var(--muted)',
                borderColor: on ? `color-mix(in srgb, ${PALETTE[i % PALETTE.length]} 45%, transparent)` : 'var(--line)',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: 8, background: PALETTE[i % PALETTE.length], display: 'inline-block' }} /> {projectName(slug)}
              </button>
            );
          })}
        </div>
      )}

      <div className="stat-row" style={{ marginBottom: 18 }}>
        <Tile icon={<Images size={13} />} k="Entries" v={agg.total} />
        <Tile icon={<FolderTree size={13} />} k="Projects" v={agg.projects} />
        <Tile icon={<ImageIcon size={13} />} k="With photos" v={agg.withPhoto} accent />
        <Tile icon={<CheckCircle2 size={13} />} k="Analyzed" v={agg.analyzed} teal />
        <Tile icon={<Sprout size={13} />} k="Species" v={agg.speciesCount} />
        <Tile icon={<MapPin size={13} />} k="GPS-tagged" v={agg.gpsCount} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', marginBottom: 16 }}>
        <div className="card pad">
          <div className="card-title"><FolderTree /> Entries per project</div>
          <HBar data={agg.byProject} colorFor={(_, i) => PALETTE[i % PALETTE.length]} />
        </div>
        <div className="card pad">
          <div className="card-title"><Sprout /> Top species</div>
          {agg.topSpecies.length ? <HBar data={agg.topSpecies} colorFor={() => 'var(--accent2)'} />
            : <p className="muted" style={{ fontSize: '.85rem' }}>No species field detected in these entries.</p>}
        </div>
      </div>

      <div className="card pad" style={{ marginBottom: 16 }}>
        <div className="card-title"><CalendarRange /> Entries over time</div>
        {agg.byMonth.length ? <MonthBars data={agg.byMonth} /> : <p className="muted" style={{ fontSize: '.85rem' }}>No dated entries.</p>}
      </div>

      {agg.gps.length > 0 && (
        <div className="card pad" style={{ marginBottom: 16 }}>
          <div className="card-title"><MapPin /> Locations ({agg.gps.length})</div>
          <WorldMap points={agg.gps} colorFor={slug => PALETTE[Math.max(0, projectsInData.indexOf(slug)) % PALETTE.length]} />
        </div>
      )}

      <div className="card pad">
        <div className="card-title"><BarChart3 /> Metadata field explorer</div>
        <p className="muted" style={{ fontSize: '.8rem', marginTop: -6, marginBottom: 12 }}>Pick a project and one of its form fields to see how the answers are distributed.</p>
        <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
          <select className="select" style={{ width: 'auto', maxWidth: 260 }} value={expProject} onChange={e => setExpProject(e.target.value)}>
            {projectsInData.map(s => <option key={s} value={s}>{projectName(s)}</option>)}
          </select>
          <select className="select" style={{ width: 'auto', maxWidth: 320 }} value={expField} onChange={e => setExpField(e.target.value)}>
            {expFields.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        {expValues.length ? <HBar data={expValues} colorFor={() => 'var(--accent)'} />
          : <p className="muted" style={{ fontSize: '.85rem' }}>No answers recorded for this field.</p>}
      </div>
    </div>
  );
};

// ---- tiles ----
const Tile: React.FC<{ icon: React.ReactNode; k: string; v: number; accent?: boolean; teal?: boolean }> = ({ icon, k, v, accent, teal }) => (
  <div className="stat"><div className="k">{icon} {k}</div><div className={`v ${accent ? 'accent' : ''} ${teal ? 'teal' : ''}`}>{v}</div></div>
);

// ---- horizontal bar chart (divs, responsive, theme-aware) ----
const HBar: React.FC<{ data: { label: string; value: number }[]; colorFor: (d: { label: string; value: number }, i: number) => string }> = ({ data, colorFor }) => {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="grid" style={{ gap: 7 }}>
      {data.map((d, i) => (
        <div key={i} title={`${d.label}: ${d.value}`}>
          <div className="row sb" style={{ justifyContent: 'space-between', fontSize: '.78rem', marginBottom: 3 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{d.label}</span>
            <span className="mono muted">{d.value}</span>
          </div>
          <div style={{ height: 8, borderRadius: 5, background: 'var(--line)', overflow: 'hidden' }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: '100%', background: colorFor(d, i), borderRadius: 5, transition: 'width .3s' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ---- monthly vertical bars ----
const MonthBars: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  const max = Math.max(1, ...data.map(d => d.value));
  const step = Math.ceil(data.length / 12);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 160, overflowX: 'auto', paddingTop: 8 }}>
      {data.map((d, i) => (
        <div key={i} title={`${d.label}: ${d.value}`} style={{ flex: '1 0 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', minWidth: 14 }}>
          <span style={{ fontSize: '.62rem', color: 'var(--muted)', marginBottom: 2 }}>{d.value || ''}</span>
          <div style={{ width: '70%', height: `${(d.value / max) * 100}%`, minHeight: d.value ? 3 : 0, background: 'var(--accent)', borderRadius: '3px 3px 0 0' }} />
          <span style={{ fontSize: '.56rem', color: 'var(--muted)', marginTop: 4, transform: 'rotate(-45deg)', whiteSpace: 'nowrap', transformOrigin: 'center', height: 26 }}>
            {i % step === 0 ? d.label : ''}
          </span>
        </div>
      ))}
    </div>
  );
};

// Resolve a CSS custom property to a concrete colour. SVG presentation
// attributes (fill=/stroke=) do NOT accept var() in Safari/WebKit, so we read
// the value and pass a literal colour instead — renders in every browser.
function readVars(names: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  const cs = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null;
  for (const [k, fallback] of Object.entries(names)) out[k] = (cs?.getPropertyValue(k).trim() || fallback);
  return out;
}

// ---- World map (fixed equirectangular projection + graticule) ----
const WorldMap: React.FC<{
  points: { lat: number; lng: number; label: string; project: string }[];
  colorFor: (slug: string) => string;
}> = ({ points, colorFor }) => {
  const W = 720, H = 360;
  const x = (lng: number) => ((lng + 180) / 360) * W;
  const y = (lat: number) => ((90 - lat) / 180) * H;
  const lngLines = [-180, -150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180];
  const latLines = [-90, -60, -30, 0, 30, 60, 90];
  const c = readVars({ '--line': '#e5e9f0', '--muted': '#5a6473', '--accent': '#3b6ea5', '--bg': '#ffffff' });

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 460, borderRadius: 8, display: 'block' }}>
        {/* ocean */}
        <rect x={0} y={0} width={W} height={H} fill={c['--accent']} fillOpacity={0.07} stroke={c['--line']} />
        {/* graticule */}
        {lngLines.map(v => <line key={`x${v}`} x1={x(v)} y1={0} x2={x(v)} y2={H} stroke={c['--line']} strokeWidth={v === 0 ? 1.3 : 0.6} />)}
        {latLines.map(v => <line key={`y${v}`} x1={0} y1={y(v)} x2={W} y2={y(v)} stroke={c['--line']} strokeWidth={v === 0 ? 1.3 : 0.6} />)}
        {/* labels */}
        {lngLines.filter(v => v % 60 === 0).map(v => (
          <text key={`lx${v}`} x={x(v) + 2} y={H - 4} fontSize={9} fill={c['--muted']}>{v === 0 ? '0°' : `${Math.abs(v)}°${v < 0 ? 'W' : 'E'}`}</text>
        ))}
        {latLines.filter(v => v !== 0).map(v => (
          <text key={`ly${v}`} x={3} y={y(v) - 2} fontSize={9} fill={c['--muted']}>{`${Math.abs(v)}°${v < 0 ? 'S' : 'N'}`}</text>
        ))}
        {/* points */}
        {points.map((p, i) => (
          <circle key={i} cx={x(p.lng)} cy={y(p.lat)} r={4} fill={colorFor(p.project)} fillOpacity={0.8} stroke={c['--bg']} strokeWidth={0.7}>
            <title>{`${p.label} — ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="muted" style={{ fontSize: '.72rem', marginTop: 4 }}>Equirectangular world projection · {points.length} geotagged entries · hover a point for details</div>
    </div>
  );
};

// ---- aggregation ----
function computeAggregates(entries: Ec5Entry[]) {
  const byProjectMap = new Map<string, number>();
  const speciesMap = new Map<string, number>();
  const monthMap = new Map<string, number>();
  const gps: { lat: number; lng: number; label: string; project: string }[] = [];
  let withPhoto = 0, analyzed = 0;

  for (const e of entries) {
    byProjectMap.set(e.project, (byProjectMap.get(e.project) || 0) + 1);
    if (e.photoUrl) withPhoto++;
    if (e.marker?.markerFound) analyzed++;
    if (e.species) speciesMap.set(e.species, (speciesMap.get(e.species) || 0) + 1);
    if (e.gps) gps.push({ ...e.gps, label: e.title, project: e.project });
    const d = e.createdAt || e.uploadedAt;
    if (d && d.length >= 7) monthMap.set(d.slice(0, 7), (monthMap.get(d.slice(0, 7)) || 0) + 1);
  }

  const byProject = [...byProjectMap.entries()].sort((a, b) => b[1] - a[1]).map(([slug, v]) => ({ label: projectName(slug), value: v }));
  const topSpecies = [...speciesMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, value]) => ({ label, value }));
  const byMonth = fillMonths(monthMap);

  return {
    total: entries.length,
    projects: byProjectMap.size,
    withPhoto, analyzed,
    speciesCount: speciesMap.size,
    gpsCount: gps.length, gps,
    byProject, topSpecies, byMonth,
  };
}

// Continuous month buckets from earliest to latest so gaps render as zero bars.
function fillMonths(m: Map<string, number>): { label: string; value: number }[] {
  const keys = [...m.keys()].sort();
  if (!keys.length) return [];
  const [ys, ms] = keys[0].split('-').map(Number);
  const [ye, me] = keys[keys.length - 1].split('-').map(Number);
  const out: { label: string; value: number }[] = [];
  let y = ys, mo = ms;
  for (let guard = 0; guard < 240; guard++) {
    const key = `${y}-${String(mo).padStart(2, '0')}`;
    out.push({ label: key, value: m.get(key) || 0 });
    if (y === ye && mo === me) break;
    mo++; if (mo > 12) { mo = 1; y++; }
  }
  return out;
}

function fieldNames(entries: Ec5Entry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) for (const f of e.fields) set.add(f.name);
  return [...set];
}
function valueCounts(entries: Ec5Entry[], fieldName: string): { label: string; value: number }[] {
  const m = new Map<string, number>();
  for (const e of entries) {
    const f = e.fields.find(x => x.name === fieldName);
    if (f && f.value) m.set(f.value, (m.get(f.value) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([label, value]) => ({ label, value }));
}
