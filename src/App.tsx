import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Database as DbIcon, UploadCloud, Share2, Info, Search, Menu, X, Sun, Moon, Sprout, AlertTriangle, BarChart3 } from 'lucide-react';
import type { Ec5Entry, MarkerAnalysis, CollectionStats } from './types';
import {
  fetchEntriesPage, fetchAllPage, getActive, setActive as persistActive, getProjects,
  projectName, isDemoProject, ALL, type ProjectRef,
} from './api/epicollect';
import { Database } from './components/Database';
import { Dashboard } from './components/Dashboard';
import { Contribute } from './components/Contribute';
import { ExportShare } from './components/ExportShare';
import { About } from './components/About';

type Tab = 'database' | 'dashboard' | 'contribute' | 'export' | 'about';

const NAV: { id: Tab; label: string; sub: string; icon: React.ComponentType<any> }[] = [
  { id: 'database', label: 'Database', sub: 'Browse & analyze', icon: DbIcon },
  { id: 'dashboard', label: 'Dashboard', sub: 'Metadata analytics', icon: BarChart3 },
  { id: 'contribute', label: 'Contribute', sub: 'Projects & app', icon: UploadCloud },
  { id: 'export', label: 'Export & share', sub: 'Manifest · CSV', icon: Share2 },
  { id: 'about', label: 'About', sub: 'Marker & pipeline', icon: Info },
];

const LOGO = `${import.meta.env.BASE_URL}cose/cose-logo.png`;
const PER_PAGE = 50;

function initialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('cose-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [tab, setTab] = useState<Tab>('database');
  const [projects, setProjects] = useState<ProjectRef[]>(getProjects);
  const [active, setActive] = useState<string>(getActive);
  const [entries, setEntries] = useState<Ec5Entry[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cose-theme', theme);
  }, [theme]);

  const load = useCallback(async (sel: string, targetPage: number, replace: boolean) => {
    setLoading(true); if (replace) setErrors([]);
    try {
      const res = sel === ALL
        ? await fetchAllPage(getProjects().map(p => p.slug), PER_PAGE)
        : await fetchEntriesPage(sel, targetPage, PER_PAGE);
      setEntries(prev => (replace ? res.entries : [...prev, ...res.entries]));
      setPage(res.page); setHasNext(res.hasNext); setTotalAvailable(res.total);
      setErrors(res.errors);
    } catch (e) {
      if (replace) setEntries([]);
      setErrors([e instanceof Error ? e.message : String(e)]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(active, 1, true); }, [active, load]);

  const changeActive = (sel: string) => {
    if (sel === active) { setTab('database'); return; }
    persistActive(sel); setActive(sel); setEntries([]); setPage(1); setTab('database');
  };
  const refreshProjects = () => setProjects(getProjects());

  const onMarkerChanged = (uuid: string, marker: MarkerAnalysis | null) =>
    setEntries(prev => prev.map(e => (e.uuid === uuid ? { ...e, marker } : e)));

  const stats: CollectionStats = useMemo(() => ({
    total: entries.length,
    totalAvailable,
    withPhoto: entries.filter(e => e.photoUrl).length,
    analyzed: entries.filter(e => e.marker?.markerFound).length,
  }), [entries, totalAvailable]);

  const activeLabel = active === ALL ? 'All projects' : projectName(active);

  return (
    <div className={`app ${menuOpen ? 'menu-open' : ''}`}>
      <div className="scrim" onClick={() => setMenuOpen(false)} />

      <aside className="rail">
        <div className="rail-brand">
          <img src={LOGO} alt="CoSE" />
          <div>
            <div className="t1">AstroBotany</div>
            <div className="t2">Calibration Image DB</div>
          </div>
        </div>
        <nav>
          {NAV.map(({ id, label, sub, icon: Icon }) => (
            <button key={id} className={`navbtn ${tab === id ? 'active' : ''}`} onClick={() => { setTab(id); setMenuOpen(false); }}>
              <Icon /><span>{label}<span className="sub">{sub}</span></span>
            </button>
          ))}
        </nav>
        <div className="rail-foot">
          <div className="row" style={{ gap: 6 }}><Sprout size={14} color="var(--accent2)" /> {stats.total} loaded · {stats.analyzed} calibrated</div>
          <div style={{ marginTop: 6 }}>Viewing: <span className="mono">{activeLabel}</span></div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn hamburger" onClick={() => setMenuOpen(o => !o)}>{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
          <div className="search">
            <Search />
            <input placeholder="Search title, species, metadata…" value={query} onChange={e => setQuery(e.target.value)} onFocus={() => setTab('database')} />
          </div>
          <span className="grow" />
          <select className="select" style={{ width: 'auto', maxWidth: 220 }} value={active} onChange={e => changeActive(e.target.value)} title="Choose Epicollect5 project">
            {projects.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            {projects.length > 1 && <option value={ALL}>All projects</option>}
          </select>
          <button className="icon-btn" title="Toggle theme" onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <main className="content">
          {isDemoProject(active) && tab === 'database' && (
            <div className="card pad" style={{ marginBottom: 14, borderColor: 'var(--accent)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <AlertTriangle size={18} color="var(--accent)" />
              <div style={{ fontSize: '.85rem' }}>Showing Epicollect5’s public demo project. Choose a real project from the selector, or add one in <button className="btn btn-sm btn-primary" style={{ padding: '2px 8px' }} onClick={() => setTab('contribute')}>Contribute</button></div>
            </div>
          )}
          {active !== ALL && !isDemoProject(active) && tab === 'database' && !loading && stats.total > 0 && stats.withPhoto === 0 && (
            <div className="card pad" style={{ marginBottom: 14, borderColor: 'var(--warn)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertTriangle size={18} color="var(--warn)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: '.85rem' }}>
                This project has entries but <strong>no Photo field</strong>, so there are no images to analyse yet. Add a <span className="mono">Photo</span> question to its Epicollect5 form so contributors can attach a specimen photo next to the marker — the calibration analysis lights up automatically. You can still browse the metadata below.
              </div>
            </div>
          )}
          {errors.length > 0 && tab === 'database' && (
            <div className="card pad" style={{ marginBottom: 14, borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: '.82rem' }}>
              {errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}

          {tab === 'database' ? (
            <Database entries={entries} query={query} loading={loading} hasNext={hasNext} showProject={active === ALL}
              onLoadMore={() => load(active, page + 1, false)} onMarkerChanged={onMarkerChanged} />
          ) : tab === 'dashboard' ? (
            <Dashboard />
          ) : tab === 'contribute' ? (
            <Contribute projects={projects} active={active} onChangeActive={changeActive} onProjectsChange={refreshProjects} />
          ) : tab === 'export' ? (
            <ExportShare entries={entries} label={activeLabel} stats={stats} />
          ) : (
            <About />
          )}
        </main>
      </div>
    </div>
  );
}
