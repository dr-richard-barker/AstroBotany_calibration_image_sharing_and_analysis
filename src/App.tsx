import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Database as DbIcon, UploadCloud, Share2, Info, Search, Menu, X, Sun, Moon, Sprout, AlertTriangle } from 'lucide-react';
import type { Ec5Entry, MarkerAnalysis, CollectionStats } from './types';
import { fetchEntriesPage, getProjectSlug, setProjectSlug, hydrateMarkers, isDemoProject } from './api/epicollect';
import { Database } from './components/Database';
import { Contribute } from './components/Contribute';
import { ExportShare } from './components/ExportShare';
import { About } from './components/About';

type Tab = 'database' | 'contribute' | 'export' | 'about';

const NAV: { id: Tab; label: string; sub: string; icon: React.ComponentType<any> }[] = [
  { id: 'database', label: 'Database', sub: 'Browse & analyze', icon: DbIcon },
  { id: 'contribute', label: 'Contribute', sub: 'Epicollect5 app', icon: UploadCloud },
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
  const [slug, setSlug] = useState<string>(getProjectSlug);
  const [entries, setEntries] = useState<Ec5Entry[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cose-theme', theme);
  }, [theme]);

  const loadPage = useCallback(async (targetSlug: string, targetPage: number, replace: boolean) => {
    setLoading(true); setError(null);
    try {
      const res = await fetchEntriesPage(targetSlug, targetPage, PER_PAGE);
      const hydrated = hydrateMarkers(targetSlug, res.entries);
      setEntries(prev => (replace ? hydrated : [...prev, ...hydrated]));
      setPage(res.page); setHasNext(res.hasNext); setTotalAvailable(res.total);
    } catch (e) {
      if (replace) setEntries([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPage(slug, 1, true); }, [slug, loadPage]);

  const changeSlug = (next: string) => {
    const s = next.trim();
    if (!s || s === slug) { setTab('database'); return; }
    setProjectSlug(s); setSlug(s); setEntries([]); setPage(1); setTab('database');
  };

  const onMarkerChanged = (uuid: string, marker: MarkerAnalysis | null) =>
    setEntries(prev => prev.map(e => (e.uuid === uuid ? { ...e, marker } : e)));

  const stats: CollectionStats = useMemo(() => ({
    total: entries.length,
    totalAvailable,
    withPhoto: entries.filter(e => e.photoUrl).length,
    analyzed: entries.filter(e => e.marker?.markerFound).length,
  }), [entries, totalAvailable]);

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
          <div style={{ marginTop: 6 }}>Project: <span className="mono">{slug}</span></div>
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
          <button className="icon-btn" title="Toggle theme" onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <main className="content">
          {isDemoProject(slug) && tab === 'database' && (
            <div className="card pad" style={{ marginBottom: 14, borderColor: 'var(--accent)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <AlertTriangle size={18} color="var(--accent)" />
              <div style={{ fontSize: '.85rem' }}>Showing Epicollect5’s public demo project. Set your own in <button className="btn btn-sm btn-primary" style={{ padding: '2px 8px' }} onClick={() => setTab('contribute')}>Contribute</button></div>
            </div>
          )}
          {error && (
            <div className="card pad" style={{ marginBottom: 14, borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: '.85rem' }}>
              Couldn’t load “{slug}”: {error}
            </div>
          )}

          {tab === 'database' ? (
            <Database entries={entries} slug={slug} query={query} loading={loading} hasNext={hasNext}
              onLoadMore={() => loadPage(slug, page + 1, false)} onMarkerChanged={onMarkerChanged} />
          ) : tab === 'contribute' ? (
            <Contribute slug={slug} onSlugChange={changeSlug} />
          ) : tab === 'export' ? (
            <ExportShare entries={entries} slug={slug} stats={stats} />
          ) : (
            <About />
          )}
        </main>
      </div>
    </div>
  );
}
