import React, { useState } from 'react';
import { Smartphone, ExternalLink, FolderCog, Plus, Trash2, Eye, Camera, MapPin, UploadCloud, Apple, Play, ImagePlus } from 'lucide-react';
import { addProject, removeProject, isBuiltin, projectUrl, addEntryUrl, type ProjectRef } from '../api/epicollect';

interface Props {
  projects: ProjectRef[];
  active: string;
  onChangeActive: (slug: string) => void;
  onProjectsChange: () => void;
}

export const Contribute: React.FC<Props> = ({ projects, active, onChangeActive, onProjectsChange }) => {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');

  const add = () => {
    if (!slug.trim()) return;
    addProject(slug, name);
    setSlug(''); setName('');
    onProjectsChange();
  };
  const remove = (s: string) => { removeProject(s); onProjectsChange(); };

  return (
    <div style={{ maxWidth: 840 }}>
      <div className="page-head">
        <div className="eyebrow">Contribute</div>
        <h1>Projects &amp; contributions</h1>
        <p>This database pulls live from one or more free <a href="https://five.epicollect.net" target="_blank" rel="noreferrer">Epicollect5</a> projects. Add any public project by its slug, switch between them, or view them all together.</p>
      </div>

      <div className="grid" style={{ gap: 16 }}>
        <div className="card pad">
          <div className="card-title"><FolderCog /> Epicollect5 projects</div>
          <table className="data" style={{ marginBottom: 12 }}>
            <thead><tr><th>Project</th><th>Slug</th><th style={{ width: 120 }}></th></tr></thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.slug}>
                  <td>{p.name} {p.slug === active && <span className="badge info" style={{ marginLeft: 4 }}>viewing</span>}</td>
                  <td className="mono" style={{ fontSize: '.78rem' }}>{p.slug}</td>
                  <td>
                    <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-ghost" title="View" onClick={() => onChangeActive(p.slug)}><Eye size={14} /></button>
                      <a className="btn btn-sm btn-ghost" title="Open in Epicollect5" href={projectUrl(p.slug)} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a>
                      {!isBuiltin(p.slug) && <button className="btn btn-sm btn-ghost" title="Remove" onClick={() => remove(p.slug)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row wrap" style={{ gap: 8, alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: '2 1 200px', marginBottom: 0 }}><label>Add a project — slug</label>
              <input className="input" placeholder="my-epicollect-project" value={slug} onChange={e => setSlug(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
            </div>
            <div className="field" style={{ flex: '1 1 140px', marginBottom: 0 }}><label>Display name (optional)</label>
              <input className="input" placeholder="My project" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
            </div>
            <button className="btn btn-primary" onClick={add}><Plus size={16} /> Add</button>
          </div>
          <p className="muted" style={{ fontSize: '.78rem', marginTop: 8 }}>
            The slug is the project name lower-cased with hyphens (from its Epicollect5 URL). Projects and the current view are remembered in your browser; share a direct link with <span className="mono">?project=slug</span>.
          </p>
        </div>

        <div className="card pad">
          <div className="card-title"><ImagePlus /> Enable calibration-marker analysis</div>
          <p style={{ fontSize: '.88rem', margin: '0 0 6px' }}>
            To use the scale &amp; colour analysis, an Epicollect5 form needs a <strong>Photo</strong> question. Add one in the Epicollect5 form builder and ask contributors to photograph the specimen <strong>next to the AstroBotany marker</strong>. Photo entries then appear here with a thumbnail and a <em>Detect marker</em> button; metadata-only projects are still browsable.
          </p>
        </div>

        <div className="card pad">
          <div className="card-title"><Smartphone /> Contribute from your phone</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: '.9rem', lineHeight: 1.7 }}>
            <li>Install the free Epicollect5 app and add the project by name.</li>
            <li><Camera size={13} style={{ verticalAlign: -2 }} /> Add an entry — include a photo next to the marker if the form has a Photo field.</li>
            <li>Fill in species / notes; <MapPin size={13} style={{ verticalAlign: -2 }} /> GPS is captured automatically.</li>
            <li><UploadCloud size={13} style={{ verticalAlign: -2 }} /> Upload. It appears here on the next refresh.</li>
          </ol>
          <div className="row wrap" style={{ gap: 8, marginTop: 12 }}>
            <a className="btn btn-sm" href="https://apps.apple.com/app/epicollect5/id1183858199" target="_blank" rel="noreferrer"><Apple /> iOS app</a>
            <a className="btn btn-sm" href="https://play.google.com/store/apps/details?id=uk.ac.imperial.epicollect.five" target="_blank" rel="noreferrer"><Play /> Android app</a>
            <a className="btn btn-sm btn-teal" href={addEntryUrl(active)} target="_blank" rel="noreferrer"><UploadCloud /> Add via web</a>
          </div>
        </div>
      </div>
    </div>
  );
};
