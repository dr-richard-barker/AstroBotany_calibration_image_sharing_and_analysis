import React from 'react';
import { Ruler, Cpu, Database, Github } from 'lucide-react';

export const About: React.FC = () => (
  <div style={{ maxWidth: 760 }}>
    <div className="page-head">
      <div className="eyebrow">About</div>
      <h1>What this is</h1>
      <p>A community database for sharing images of organisms and science photographed alongside the AstroBotany calibration marker — so that scale (px/mm) and colour are recoverable from any phone photo.</p>
    </div>

    <div className="grid" style={{ gap: 16 }}>
      <div className="card pad">
        <div className="card-title"><Ruler /> The calibration marker</div>
        <p style={{ fontSize: '.9rem' }}>The AstroBotany card carries four corner ArUco fiducials (dictionary <span className="mono">ARUCO_MIP_36h12</span>) around a 15-chip colour + grayscale reference, with a fixed <span className="mono">4.3&nbsp;cm</span> span between opposite corner centres. Detecting the four corners gives the pixels-per-cm scale, the in-plane rotation, and a sampling grid for the colour chips.</p>
      </div>

      <div className="card pad">
        <div className="card-title"><Database /> Storage: Epicollect5 (free)</div>
        <p style={{ fontSize: '.9rem' }}>Photos and metadata are collected and stored in a free <a href="https://five.epicollect.net" target="_blank" rel="noreferrer">Epicollect5</a> project (Imperial College / CGPS) — contributors use the Epicollect5 mobile app, which captures the phone photo, GPS, and fields and uploads them. This app is a <strong>static site</strong> that reads the project’s open, CORS-enabled API directly from your browser. No server, no hosting fees.</p>
      </div>

      <div className="card pad">
        <div className="card-title"><Cpu /> Analysis — in your browser, no AI service</div>
        <p style={{ fontSize: '.9rem' }}>Marker detection runs entirely client-side: a geometric contour detector locates the corner fiducials, with the <span className="mono">js-aruco2</span> ArUco decoder as a fallback. From the detected quad the app derives scale, rotation, and a 3×4 affine colour correction against the AstroBotany reference. This engine is recycled from
        {' '}<a href="https://dr-richard-barker.github.io/Anthocyanin-Image-analysis/" target="_blank" rel="noreferrer">Anthocyanin-Image-analysis</a>. There is no Google GenAI / Gemini dependency. Results are cached in your browser and included in the exported manifest.</p>
      </div>

      <div className="card pad">
        <div className="card-title"><Github /> Open source</div>
        <p style={{ fontSize: '.9rem' }}>Built for the Center of Space Exploration. Related projects:
        {' '}<a href="https://dr-richard-barker.github.io/Anthocyanin-Image-analysis/" target="_blank" rel="noreferrer">Anthocyanin-Image-analysis</a> and
        {' '}<a href="https://dr-richard-barker.github.io/astroroot/" target="_blank" rel="noreferrer">astroroot</a>.</p>
      </div>
    </div>
  </div>
);
