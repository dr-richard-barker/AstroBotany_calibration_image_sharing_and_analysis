import React, { useState } from 'react';
import { Smartphone, ExternalLink, FolderCog, Plus, Trash2, Eye, Camera, MapPin, UploadCloud, Apple, Play, ImagePlus, Github, Loader2 } from 'lucide-react';
import { addProject, removeProject, addGithubSource, isBuiltin, isGithub, projectUrl, type ProjectRef } from '../api/epicollect';
import { parseGithub, defaultName, fetchGithubImages } from '../api/github';

interface Props {
  projects: ProjectRef[];
  active: string;
  onChangeActive: (slug: string) => void;
  onProjectsChange: () => void;
}

export const Contribute: React.FC<Props> = ({ projects, active, onChangeActive, onProjectsChange }) => {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [ghUrl, setGhUrl] = useState('');
  const [ghBusy, setGhBusy] = useState(false);
  const [ghMsg, setGhMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const add = () => {
    if (!slug.trim()) return;
    addProject(slug, name);
    setSlug(''); setName('');
    onProjectsChange();
  };
  const remove = (s: string) => { removeProject(s); onProjectsChange(); };

  const addGithub = async () => {
    const t = parseGithub(ghUrl);
    if (!t) { setGhMsg({ ok: false, text: 'Not a GitHub folder URL. Use e.g. https://github.com/owner/repo/tree/main/path' }); return; }
    setGhBusy(true); setGhMsg(null);
    try {
      const files = await fetchGithubImages(t);            // validate + warm the cache
      if (!files.length) { setGhMsg({ ok: false, text: 'No images found in that folder.' }); return; }
      const ref = addGithubSource(t, defaultName(t));
      onProjectsChange();
      onChangeActive(ref.slug);
      setGhUrl('');
      setGhMsg({ ok: true, text: `Added ${files.length} images from ${ref.name}.` });
    } catch (e) {
      setGhMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally { setGhBusy(false); }
  };

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="page-head">
        <div className="eyebrow">Contribute</div>
        <h1>Sources &amp; contributions</h1>
        <p>This database pulls live from free <a href="https://five.epicollect.net" target="_blank" rel="noreferrer">Epicollect5</a> projects and public <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a> image folders. Add any source, switch between them, or view them all together.</p>
      </div>

      <div className="grid" style={{ gap: 16 }}>
        {/* GitHub import */}
        <div className="card pad">
          <div className="card-title"><Github /> Import images from a GitHub folder</div>
          <p className="muted" style={{ fontSize: '.82rem', marginTop: -6, marginBottom: 10 }}>
            Paste a link to a folder of images in any public repo. Every image is listed straight from GitHub (no upload, no copy) and marker detection runs on them. Drop a <span className="mono">metadata.csv</span> or <span className="mono">metadata.json</span> in the folder to attach per-image metadata: a <span className="mono">filename</span> column joins rows to images, and <span className="mono">species</span>, <span className="mono">latitude</span>/<span className="mono">longitude</span>, <span className="mono">title</span>, and any other columns are picked up automatically.
          </p>
          <div className="row wrap" style={{ gap: 8, alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: '1 1 320px', marginBottom: 0 }}><label>GitHub folder URL</label>
              <input className="input" placeholder="https://github.com/dr-richard-barker/ExoLab_11/tree/main/grw08_images_11122024"
                value={ghUrl} onChange={e => setGhUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGithub()} />
            </div>
            <button className="btn btn-primary" disabled={ghBusy || !ghUrl.trim()} onClick={addGithub}>
              {ghBusy ? <Loader2 className="spin" size={16} /> : <Plus size={16} />} Add folder
            </button>
          </div>
          {ghMsg && <div style={{ marginTop: 8, fontSize: '.82rem', color: ghMsg.ok ? 'var(--ok)' : 'var(--danger)' }}>{ghMsg.text}</div>}
          <p className="muted" style={{ fontSize: '.74rem', marginTop: 8 }}>Uses the public GitHub API (60 requests/hour, anonymous). Large folders load thumbnails lazily as you scroll.</p>
        </div>

        {/* sources table */}
        <div className="card pad">
          <div className="card-title"><FolderCog /> Sources</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data" style={{ marginBottom: 12 }}>
              <thead><tr><th>Source</th><th>Type</th><th style={{ width: 110 }}></th></tr></thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.slug}>
                    <td>{p.name} {p.slug === active && <span className="badge info" style={{ marginLeft: 4 }}>viewing</span>}</td>
                    <td>{isGithub(p.slug) ? <span className="chip"><Github size={11} /> GitHub</span> : <span className="chip">Epicollect5</span>}</td>
                    <td>
                      <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-sm btn-ghost" title="View" onClick={() => onChangeActive(p.slug)}><Eye size={14} /></button>
                        <a className="btn btn-sm btn-ghost" title="Open source" href={projectUrl(p.slug)} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a>
                        {!isBuiltin(p.slug) && <button className="btn btn-sm btn-ghost" title="Remove" onClick={() => remove(p.slug)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row wrap" style={{ gap: 8, alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: '2 1 200px', marginBottom: 0 }}><label>Add an Epicollect5 project — slug</label>
              <input className="input" placeholder="my-epicollect-project" value={slug} onChange={e => setSlug(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
            </div>
            <div className="field" style={{ flex: '1 1 140px', marginBottom: 0 }}><label>Display name (optional)</label>
              <input className="input" placeholder="My project" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
            </div>
            <button className="btn" onClick={add}><Plus size={16} /> Add</button>
          </div>
          <p className="muted" style={{ fontSize: '.78rem', marginTop: 8 }}>
            Sources and the current view are remembered in your browser. Share a direct link with <span className="mono">?project=slug</span>.
          </p>
        </div>

        <div className="card pad">
          <div className="card-title"><ImagePlus /> Enable calibration-marker analysis</div>
          <p style={{ fontSize: '.88rem', margin: 0 }}>
            Any image source works with the scale &amp; colour analysis. For Epicollect5, the form needs a <strong>Photo</strong> question; for GitHub, just point at a folder of images. Photograph the specimen <strong>next to the AstroBotany marker</strong> so scale and colour are recoverable; entries with a photo get a <em>Detect marker</em> button.
          </p>
        </div>

        <div className="card pad">
          <div className="card-title"><Smartphone /> Contribute from your phone (Epicollect5)</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: '.9rem', lineHeight: 1.7 }}>
            <li>Install the free Epicollect5 app and add the project by name.</li>
            <li><Camera size={13} style={{ verticalAlign: -2 }} /> Add an entry — include a photo next to the marker if the form has a Photo field.</li>
            <li>Fill in species / notes; <MapPin size={13} style={{ verticalAlign: -2 }} /> GPS is captured automatically.</li>
            <li><UploadCloud size={13} style={{ verticalAlign: -2 }} /> Upload. It appears here on the next refresh.</li>
          </ol>
          <div className="row wrap" style={{ gap: 8, marginTop: 12 }}>
            <a className="btn btn-sm" href="https://apps.apple.com/app/epicollect5/id1183858199" target="_blank" rel="noreferrer"><Apple /> iOS app</a>
            <a className="btn btn-sm" href="https://play.google.com/store/apps/details?id=uk.ac.imperial.epicollect.five" target="_blank" rel="noreferrer"><Play /> Android app</a>
          </div>
        </div>
      </div>
    </div>
  );
};
