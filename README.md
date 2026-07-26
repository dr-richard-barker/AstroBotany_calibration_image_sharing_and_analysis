# AstroBotany Calibration Image Database

A community database for sharing images of organisms and science photographed
**alongside the AstroBotany calibration marker** — so that physical scale
(px/mm) and colour are recoverable from an ordinary phone photo.

Contributors add photos from their phone or import a shared **Google Photos**
album. Each image has its device metadata read on-device, is compressed for
storage, and can have the calibration marker detected automatically. Everything
is stored in a local database and is fully exportable.

> This project began as a Google AI Studio applet. It has been rebuilt to remove
> the Google GenAI / Gemini dependency entirely — **all analysis is now real,
> deterministic, and runs client-side** — and re-themed to the Center of Space
> Exploration (CoSE) design used across the sibling sites.

## What it does

- **Contribute from a phone** — capture or upload one or more photos. EXIF
  (device, timestamp, GPS, exposure) is read with [`exifr`](https://github.com/MikeKovarik/exifr)
  *before* the image is re-encoded, then the image is down-scaled and JPEG-
  compressed to a database-friendly size on-device. Only the compressed image +
  metadata leave the browser.
- **Import a Google Photos album** — paste a public shared-album link
  (`photos.app.goo.gl/…` or `photos.google.com/share/…`). The server resolves
  the album, downloads each photo, extracts metadata, and stores it.
- **Detect the calibration marker** — a client-side computer-vision pipeline
  (recycled from [Anthocyanin-Image-analysis](https://dr-richard-barker.github.io/Anthocyanin-Image-analysis/))
  finds the four corner ArUco fiducials of the AstroBotany card, then derives
  the **pixels-per-mm scale**, **in-plane rotation**, and a **15-chip colour
  calibration** (affine fit against the AstroBotany reference). No AI service.
- **Browse & export** — search the shared library, inspect any image, and
  download the whole dataset as an open **manifest.json** or a **`.zip`** archive
  (manifest + all stored images) for PlantCV, Zenodo, or Hugging Face.

## The calibration marker

The AstroBotany card carries four corner ArUco fiducials (dictionary
`ARUCO_MIP_36h12`) around a 15-chip colour + grayscale reference, with a fixed
**4.3 cm** span between opposite corner centres. Detecting the four corners gives
the scale, the rotation, and a sampling grid for the colour chips. Detection uses
a geometric contour detector for the custom fiducials, with the
[`js-aruco2`](https://github.com/damianofalcioni/js-aruco2) decoder as a fallback.

## Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| UI | React 19 + Vite | CoSE-themed, light/dark, mobile-friendly |
| Capture | `exifr` + Canvas | EXIF read + JPEG compression, on-device |
| Marker CV | `js-aruco2` + `colorcalib.ts` | ArUco / geometric detection, colour fit — client-side |
| Server | Express | Image CRUD, stats, export, Google Photos ingestion |
| Storage | **`node:sqlite`** (built-in) + files | No native modules to compile |

There is **no** `@google/genai` dependency and no API key of any kind.

## Getting started

```bash
npm install
npm run seed     # optional: load the real, openly-licensed starter images
npm run dev      # http://localhost:3000
```

Build & run in production:

```bash
npm run build
npm start
```

The database and uploaded files live in `./data/` (git-ignored) — each
deployment builds its own.

## Seed images

`npm run seed` loads real, openly-licensed starter images recycled from Richard
Barker's own repositories (no stock photos, no fabricated records):

- ArUco marker target and colour-card demos (`Medicago truncatula`, Fast Plants)
  from [Anthocyanin-Image-analysis](https://dr-richard-barker.github.io/Anthocyanin-Image-analysis/)
- APEX-03 spaceflight and ground-control Arabidopsis root scans from
  [astroroot](https://dr-richard-barker.github.io/astroroot/)

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/images?q=&marker=` | List / search records |
| `GET` | `/api/images/:id` | One record |
| `POST` | `/api/images` | Create from base64 image + metadata |
| `PATCH` | `/api/images/:id/marker` | Save marker analysis |
| `DELETE` | `/api/images/:id` | Remove a record |
| `GET` | `/api/stats` | Real counts (no fabricated numbers) |
| `POST` | `/api/ingest/google-photos` | Ingest a shared album |
| `GET` | `/api/export/manifest.json` | Full dataset manifest |
| `GET` | `/api/export/archive.zip` | Manifest + all images |

## License

Code: MIT. Seed images and contributed content carry their own licenses as
recorded per-record in the database.
