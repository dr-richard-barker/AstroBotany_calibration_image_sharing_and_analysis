import React, { useState } from 'react';
import { Smartphone, ExternalLink, FolderCog, CheckCircle2, Camera, MapPin, UploadCloud, Apple, Play } from 'lucide-react';
import { projectUrl, addEntryUrl, isDemoProject } from '../api/epicollect';

interface Props {
  slug: string;
  onSlugChange: (slug: string) => void;
}

export const Contribute: React.FC<Props> = ({ slug, onSlugChange }) => {
  const [draft, setDraft] = useState(slug);
  const demo = isDemoProject(slug);

  return (
    <div style={{ maxWidth: 820 }}>
      <div className="page-head">
        <div className="eyebrow">Contribute</div>
        <h1>Add photos via Epicollect5</h1>
        <p>Photos and metadata live in a free <a href="https://five.epicollect.net" target="_blank" rel="noreferrer">Epicollect5</a> project. Anyone can contribute from the free Epicollect5 mobile app — take a photo of your organism or experiment next to the AstroBotany marker, and it uploads with GPS and metadata. New entries appear here after they sync.</p>
      </div>

      <div className="grid" style={{ gap: 16 }}>
        <div className="card pad">
          <div className="card-title"><FolderCog /> Project</div>
          {demo && (
            <div className="badge info" style={{ marginBottom: 10 }}>Showing Epicollect5’s public demo project — set your own below.</div>
          )}
          <div className="field"><label>Epicollect5 project name / slug</label>
            <div className="row" style={{ gap: 8 }}>
              <input className="input" value={draft} onChange={e => setDraft(e.target.value)} placeholder="my-astrobotany-project"
                onKeyDown={e => { if (e.key === 'Enter') onSlugChange(draft); }} />
              <button className="btn btn-primary btn-sm" onClick={() => onSlugChange(draft)}>Load</button>
            </div>
          </div>
          <p className="muted" style={{ fontSize: '.78rem', marginTop: -4 }}>
            The slug is the project name lower-cased with spaces as hyphens (from its Epicollect5 URL). It’s remembered in your browser, and shareable as <span className="mono">?project=slug</span>.
          </p>
          <div className="row wrap" style={{ gap: 8, marginTop: 8 }}>
            <a className="btn btn-sm" href={projectUrl(slug)} target="_blank" rel="noreferrer"><ExternalLink /> Open project</a>
            <a className="btn btn-sm btn-teal" href={addEntryUrl(slug)} target="_blank" rel="noreferrer"><UploadCloud /> Add an entry (web)</a>
          </div>
        </div>

        <div className="card pad">
          <div className="card-title"><Smartphone /> Contribute from your phone</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: '.9rem', lineHeight: 1.7 }}>
            <li>Install the free Epicollect5 app.</li>
            <li>Search the project by name (or open the project link above) and add it.</li>
            <li><Camera size={13} style={{ verticalAlign: -2 }} /> Add an entry: photograph your specimen <strong>next to the AstroBotany marker</strong> so scale &amp; colour are recoverable.</li>
            <li>Fill in species and notes; <MapPin size={13} style={{ verticalAlign: -2 }} /> GPS is captured automatically.</li>
            <li><UploadCloud size={13} style={{ verticalAlign: -2 }} /> Upload. It appears in this database on the next refresh.</li>
          </ol>
          <div className="row wrap" style={{ gap: 8, marginTop: 12 }}>
            <a className="btn btn-sm" href="https://apps.apple.com/app/epicollect5/id1183858199" target="_blank" rel="noreferrer"><Apple /> iOS app</a>
            <a className="btn btn-sm" href="https://play.google.com/store/apps/details?id=uk.ac.imperial.epicollect.five" target="_blank" rel="noreferrer"><Play /> Android app</a>
          </div>
        </div>

        <div className="card pad">
          <div className="card-title"><CheckCircle2 /> Why Epicollect5</div>
          <p style={{ fontSize: '.88rem', margin: 0 }}>
            Epicollect5 (Imperial College / CGPS) is free for data collection and storage, handles offline capture, media, and GPS, and exposes an open read API. This app is a static viewer over that API — no server and no hosting fees — so the calibration-marker analysis lives alongside your existing GitHub Pages sites.
          </p>
        </div>
      </div>
    </div>
  );
};
