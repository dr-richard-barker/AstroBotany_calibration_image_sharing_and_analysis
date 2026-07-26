import React from 'react';
import { FileJson, FileArchive, Share2, Database } from 'lucide-react';
import type { DatabaseStats } from '../types';
import { manifestUrl, archiveUrl } from '../api/client';
import { humanBytes } from '../lib/capture';

export const ExportShare: React.FC<{ stats: DatabaseStats | null }> = ({ stats }) => (
  <div>
    <div className="page-head">
      <div className="eyebrow">Export &amp; share</div>
      <h1>Take the dataset with you</h1>
      <p>The whole database is exportable as an open manifest plus the original stored images — nothing is locked in. Use it for PlantCV pipelines, a Zenodo deposit, or a Hugging Face dataset.</p>
    </div>

    {stats && (
      <div className="stat-row" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="k">Images</div><div className="v">{stats.totalImages}</div></div>
        <div className="stat"><div className="k">With marker</div><div className="v accent">{stats.withMarker}</div></div>
        <div className="stat"><div className="k">Species</div><div className="v teal">{stats.species}</div></div>
        <div className="stat"><div className="k">Contributors</div><div className="v">{stats.contributors}</div></div>
        <div className="stat"><div className="k">Stored size</div><div className="v">{humanBytes(stats.totalBytes)}</div></div>
      </div>
    )}

    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
      <div className="card pad">
        <div className="card-title"><FileJson /> Manifest (JSON)</div>
        <p className="muted" style={{ fontSize: '.85rem' }}>Every record: metadata, EXIF, compression sizes, and marker analysis (scale, rotation, colour chips). Image files are referenced by <span className="mono">/uploads/…</span>.</p>
        <a className="btn btn-primary btn-sm" href={manifestUrl} download><FileJson /> Download manifest.json</a>
      </div>

      <div className="card pad">
        <div className="card-title"><FileArchive /> Full archive (ZIP)</div>
        <p className="muted" style={{ fontSize: '.85rem' }}>The manifest plus every stored image in one <span className="mono">.zip</span> — ready to commit to a repo or deposit for a DOI.</p>
        <a className="btn btn-sm" href={archiveUrl} download><FileArchive /> Download archive.zip</a>
      </div>

      <div className="card pad">
        <div className="card-title"><Share2 /> Share this instance</div>
        <p className="muted" style={{ fontSize: '.85rem' }}>Anyone with access to this server can contribute from their phone or import a Google Photos album. Point collaborators at the <strong>Contribute</strong> tab.</p>
        <div className="row" style={{ gap: 6, color: 'var(--muted)', fontSize: '.82rem' }}><Database size={15} /> Storage: local <span className="mono">node:sqlite</span> + files</div>
      </div>
    </div>
  </div>
);
