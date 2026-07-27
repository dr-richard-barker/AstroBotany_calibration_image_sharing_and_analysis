import React from 'react';
import { FileJson, Share2, Database, ExternalLink, Table } from 'lucide-react';
import type { Ec5Entry, CollectionStats } from '../types';
import { EC5_BASE, projectUrl } from '../api/epicollect';

interface Props {
  entries: Ec5Entry[];
  slug: string;
  stats: CollectionStats;
}

export const ExportShare: React.FC<Props> = ({ entries, slug, stats }) => {
  const downloadManifest = () => {
    const manifest = {
      generatedAt: new Date().toISOString(),
      project: slug,
      source: `${EC5_BASE}/api/export/entries/${slug}`,
      count: entries.length,
      entries: entries.map(e => ({
        uuid: e.uuid, title: e.title, species: e.species,
        createdAt: e.createdAt, uploadedAt: e.uploadedAt,
        photoUrl: e.photoUrl, gps: e.gps,
        fields: e.fields, marker: e.marker,
      })),
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `astrobotany_${slug}_manifest.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const ec5Csv = `${EC5_BASE}/api/export/entries/${slug}?format=csv`;
  const shareUrl = `${location.origin}${location.pathname}?project=${encodeURIComponent(slug)}`;

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Export &amp; share</div>
        <h1>Take the dataset with you</h1>
        <p>The photos and raw data live in Epicollect5 and are exportable there; this app adds a manifest that folds in the calibration-marker analysis you’ve computed.</p>
      </div>

      <div className="stat-row" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="k">Loaded</div><div className="v">{stats.total}<span style={{ fontSize: '.8rem' }}> / {stats.totalAvailable}</span></div></div>
        <div className="stat"><div className="k">With photo</div><div className="v accent">{stats.withPhoto}</div></div>
        <div className="stat"><div className="k">Analyzed</div><div className="v teal">{stats.analyzed}</div></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
        <div className="card pad">
          <div className="card-title"><FileJson /> Manifest + analysis (JSON)</div>
          <p className="muted" style={{ fontSize: '.85rem' }}>The loaded entries with their metadata, GPS, photo URLs, and any calibration-marker analysis (scale, rotation, colour chips) you’ve computed and cached.</p>
          <button className="btn btn-primary btn-sm" onClick={downloadManifest}><FileJson /> Download manifest.json</button>
        </div>

        <div className="card pad">
          <div className="card-title"><Table /> Raw data (Epicollect5)</div>
          <p className="muted" style={{ fontSize: '.85rem' }}>The authoritative dataset — entries and media — straight from Epicollect5, as CSV or from the project page.</p>
          <div className="row wrap" style={{ gap: 8 }}>
            <a className="btn btn-sm" href={ec5Csv} target="_blank" rel="noreferrer"><Table /> CSV export</a>
            <a className="btn btn-sm btn-ghost" href={projectUrl(slug)} target="_blank" rel="noreferrer"><ExternalLink /> Project</a>
          </div>
        </div>

        <div className="card pad">
          <div className="card-title"><Share2 /> Share this view</div>
          <p className="muted" style={{ fontSize: '.85rem' }}>A link that opens this database pointed at the same project.</p>
          <div className="row" style={{ gap: 6, fontSize: '.78rem' }}><Database size={15} /> <span className="mono" style={{ wordBreak: 'break-all' }}>{shareUrl}</span></div>
        </div>
      </div>
    </div>
  );
};
