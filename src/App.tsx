import React, { useEffect, useState, useCallback } from 'react';
import {
  Database as DbIcon, UploadCloud, Share2, Info, Search, Menu, X, Sun, Moon, Sprout,
} from 'lucide-react';
import type { ImageRecord, DatabaseStats } from './types';
import { listImages, getStats } from './api/client';
import { Contribute } from './components/Contribute';
import { Database } from './components/Database';
import { ExportShare } from './components/ExportShare';
import { About } from './components/About';

type Tab = 'contribute' | 'database' | 'export' | 'about';

const NAV: { id: Tab; label: string; sub: string; icon: React.ComponentType<any> }[] = [
  { id: 'database', label: 'Database', sub: 'Browse & inspect', icon: DbIcon },
  { id: 'contribute', label: 'Contribute', sub: 'Photo · album import', icon: UploadCloud },
  { id: 'export', label: 'Export & share', sub: 'Manifest · archive', icon: Share2 },
  { id: 'about', label: 'About', sub: 'Marker & pipeline', icon: Info },
];

function initialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('cose-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [tab, setTab] = useState<Tab>('database');
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cose-theme', theme);
  }, [theme]);

  const refresh = useCallback(async () => {
    try {
      const [imgs, s] = await Promise.all([listImages(), getStats()]);
      setImages(imgs); setStats(s);
    } catch { /* server not up yet */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const onAdded = (recs: ImageRecord[]) => {
    setImages(prev => [...recs, ...prev]);
    getStats().then(setStats).catch(() => {});
  };
  const onSaved = (rec: ImageRecord) => {
    setImages(prev => prev.map(i => (i.id === rec.id ? rec : i)));
    getStats().then(setStats).catch(() => {});
  };
  const onDeleted = (id: string) => {
    setImages(prev => prev.filter(i => i.id !== id));
    getStats().then(setStats).catch(() => {});
  };

  return (
    <div className={`app ${menuOpen ? 'menu-open' : ''}`}>
      <div className="scrim" onClick={() => setMenuOpen(false)} />

      <aside className="rail">
        <div className="rail-brand">
          <img src="/cose/cose-logo.png" alt="CoSE" />
          <div>
            <div className="t1">AstroBotany</div>
            <div className="t2">Calibration Image DB</div>
          </div>
        </div>
        <nav>
          {NAV.map(({ id, label, sub, icon: Icon }) => (
            <button key={id} className={`navbtn ${tab === id ? 'active' : ''}`} onClick={() => { setTab(id); setMenuOpen(false); }}>
              <Icon />
              <span>{label}<span className="sub">{sub}</span></span>
            </button>
          ))}
        </nav>
        <div className="rail-foot">
          <div className="row" style={{ gap: 6 }}><Sprout size={14} color="var(--accent2)" /> {stats?.totalImages ?? 0} images · {stats?.withMarker ?? 0} calibrated</div>
          <div style={{ marginTop: 6 }}>Center of Space Exploration</div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn hamburger" onClick={() => setMenuOpen(o => !o)}>{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
          <div className="search">
            <Search />
            <input placeholder="Search species, contributor, tags…" value={query} onChange={e => setQuery(e.target.value)} onFocus={() => setTab('database')} />
          </div>
          <span className="grow" />
          <button className="icon-btn" title="Toggle theme" onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <main className="content">
          {loading ? (
            <div className="empty">Loading database…</div>
          ) : tab === 'database' ? (
            <Database images={images} query={query} onSaved={onSaved} onDeleted={onDeleted} />
          ) : tab === 'contribute' ? (
            <Contribute onAdded={onAdded} />
          ) : tab === 'export' ? (
            <ExportShare stats={stats} />
          ) : (
            <About />
          )}
        </main>
      </div>
    </div>
  );
}
