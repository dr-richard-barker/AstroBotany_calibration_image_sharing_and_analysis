import React from 'react';
import { Info, Ruler, Cpu, ShieldCheck, Github } from 'lucide-react';

export const About: React.FC = () => (
  <div style={{ maxWidth: 760 }}>
    <div className="page-head">
      <div className="eyebrow">About</div>
      <h1>What this is</h1>
      <p>A community database for sharing images of organisms and science photographed alongside the Astrobotany calibration marker — so that scale (px/mm) and colour are recoverable from any phone photo.</p>
    </div>

    <div className="grid" style={{ gap: 16 }}>
      <div className="card pad">
        <div className="card-title"><Ruler /> The calibration marker</div>
        <p style={{ fontSize: '.9rem' }}>The Astrobotany card carries four corner ArUco fiducials (dictionary <span className="mono">ARUCO_MIP_36h12</span>) around a 15-chip colour + grayscale reference, with a fixed <span className="mono">4.3&nbsp;cm</span> span between opposite corner centres. Detecting the four corners gives the pixels-per-cm scale, the in-plane rotation, and a sampling grid for the colour chips.</p>
      </div>

      <div className="card pad">
        <div className="card-title"><Cpu /> How analysis works — no AI service</div>
        <p style={{ fontSize: '.9rem' }}>Marker detection runs entirely in your browser: a geometric contour detector locates the corner fiducials, with the <span className="mono">js-aruco2</span> ArUco decoder as a fallback. From the detected quad the app derives scale, rotation, and a 3×4 affine colour correction fit against the Astrobotany reference. This engine is recycled from the
        {' '}<a href="https://dr-richard-barker.github.io/Anthocyanin-Image-analysis/" target="_blank" rel="noreferrer">Anthocyanin-Image-analysis</a> project. There is no Google GenAI / Gemini dependency.</p>
      </div>

      <div className="card pad">
        <div className="card-title"><ShieldCheck /> On-device metadata &amp; compression</div>
        <p style={{ fontSize: '.9rem' }}>When you add a photo, EXIF (device, timestamp, GPS, exposure) is read with <span className="mono">exifr</span> before the image is re-encoded, then it is down-scaled and JPEG-compressed to a database-friendly size. The original stays on your device; only the compressed image and its metadata are stored, in a local <span className="mono">node:sqlite</span> database.</p>
      </div>

      <div className="card pad">
        <div className="card-title"><Github /> Seed images &amp; sources</div>
        <p style={{ fontSize: '.9rem' }}>The starter images are real, openly-licensed content: ArUco / colour-marker demos and specimen photos from
        {' '}<a href="https://dr-richard-barker.github.io/Anthocyanin-Image-analysis/" target="_blank" rel="noreferrer">Anthocyanin-Image-analysis</a> and APEX-03 spaceflight root scans from
        {' '}<a href="https://dr-richard-barker.github.io/astroroot/" target="_blank" rel="noreferrer">astroroot</a>. No stock photos or fabricated records are used.</p>
      </div>
    </div>
  </div>
);
