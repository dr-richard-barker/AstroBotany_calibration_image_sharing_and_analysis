# AstroBotany Calibration Image Database

A community database for sharing images of organisms and science photographed
**alongside the AstroBotany calibration marker** — so that physical scale
(px/mm) and colour are recoverable from an ordinary phone photo.

This is a **static site** (deployable free to GitHub Pages) that reads image
sources — free [**Epicollect5**](https://five.epicollect.net) projects and public
**GitHub** image folders — through their open, CORS-enabled APIs, and runs the
calibration-marker analysis **entirely in your browser**. There is no server and
no hosting fee, and no Google GenAI / Gemini dependency.

**Sources.** In the **Contribute** tab you can add an Epicollect5 project by slug,
paste a GitHub folder URL (`github.com/owner/repo/tree/main/path` — images listed
straight from GitHub, CORS-open so detection runs on them), or **upload a `.zip`
of images** (e.g. exported from a Google Drive folder) or individual image files.
Uploads are unzipped, EXIF-read, compressed, and joined to an optional
`metadata.csv`/`.json` inside — all in your browser — and saved locally
(IndexedDB) as a source that survives reloads. Nothing is uploaded to a server. Epicollect5
is read-only via its API, so contributions to an Epicollect5 project happen in
the Epicollect5 app/web form; to push your *own* images + metadata into the
viewer, commit them to a GitHub repo folder and add it as a source.

**GitHub metadata sidecar.** Add a `metadata.csv` (or `.json`) next to the images
in the folder. A `filename` column joins each row to its image; `species`,
`latitude`/`longitude`, `title`, and any other columns are attached to the
entry (shown in the inspector, searchable, on the dashboard map, and exported).
Anything not in the sidecar still falls back to metadata parsed from filenames.

The **Database** tab filters entries by *All / With images / Analyzed* and by
project (toggle chips), and the **Dashboard** tab presents cross-project
analytics over every entry's metadata — entries per project, top species, a
monthly timeline, a GPS map, and an interactive field explorer.

Pick a project from the selector in the top bar, view **All projects** merged
together, or add any public project by its slug in the **Contribute** tab. The
bundled defaults are the CoSE *Clinostat Collaboration*, *AIRI Microgreen Growth
& Biomass*, and *Growing Beyond Earth 2021–2022* projects. Entries that include a
photo get a thumbnail and marker analysis; metadata-only entries are still
browsable. Per-entry photo, species, and GPS fields are auto-detected regardless
of the form's exact field names.

> Live: `https://dr-richard-barker.github.io/AstroBotany_calibration_image_sharing_and_analysis/`

## How it works

```
Contributor's phone ──(Epicollect5 app)──▶ Epicollect5 project (free storage)
                                                    │  open, CORS-enabled API
                                                    ▼
        This static site (GitHub Pages) ── reads entries + photos ──▶ browser
                                                    │
                          client-side ArUco marker detection + colour calibration
```

- **Collection + storage → Epicollect5 (free).** Contributors use the free
  Epicollect5 mobile app to photograph a specimen next to the AstroBotany marker;
  the app captures the photo, GPS, and form fields and uploads them. Epicollect5
  stores everything.
- **This app → a static viewer/analyzer.** It fetches entries from the
  Epicollect5 export API (`Access-Control-Allow-Origin: *`, so the browser calls
  it directly), shows a CoSE-themed gallery, and detects the marker on each photo
  to derive **px/mm scale**, **rotation**, and a **15-chip colour calibration**.
  Analysis is cached in your browser and included in the exported manifest.

The photo field in the Epicollect5 response is already a full media URL, so the
app mostly just reshapes entries and runs the CV.

## Set up your Epicollect5 project

1. Sign in at [five.epicollect.net](https://five.epicollect.net) (free) and
   **create a project**, e.g. *AstroBotany Calibration Images*.
2. In the form builder, add these inputs (names are flexible — the app
   auto-detects the photo, the location, and any "species" field):

   | Input | Epicollect5 type | Notes |
   |-------|------------------|-------|
   | **Title** | Text (set as the project *title* question) | e.g. specimen / sample name |
   | **Photo** | **Photo** | the specimen **next to the AstroBotany marker** |
   | **Species** | Text | auto-detected into the Species field |
   | **Notes** | Text (long) | free text |
   | **Location** | **Location** | GPS, captured automatically on the app |
   | **Contributor** | Text | optional |

3. Set the project **Access to _Public_** (Project → Settings) so the API is
   readable without a token.
4. Note the **slug** — the project name lower-cased with spaces as hyphens (it's
   in the project URL: `five.epicollect.net/project/<slug>`).
5. Open this site and set the slug in **Contribute**, or share a direct link with
   `?project=<slug>`.

Contributors then install the Epicollect5 app
([iOS](https://apps.apple.com/app/epicollect5/id1183858199) /
[Android](https://play.google.com/store/apps/details?id=uk.ac.imperial.epicollect.five)),
add the project, and submit entries.

## The calibration marker

The AstroBotany card carries four corner ArUco fiducials (dictionary
`ARUCO_MIP_36h12`) around a 15-chip colour + grayscale reference, with a fixed
**4.3 cm** span between opposite corner centres. Detecting the four corners gives
the scale, rotation, and a sampling grid for the colour chips. Detection uses a
geometric contour detector with the [`js-aruco2`](https://github.com/damianofalcioni/js-aruco2)
decoder as a fallback — the engine is recycled from
[Anthocyanin-Image-analysis](https://dr-richard-barker.github.io/Anthocyanin-Image-analysis/).

## Develop

```bash
npm install
npm run dev      # http://localhost:5173  (loads Epicollect5's public demo project)
npm run build    # static output in dist/
npm run preview
```

Set a project without editing code: `?project=<slug>` in the URL, or the
Contribute tab (stored in `localStorage`).

## Deploy (free, GitHub Pages)

A GitHub Actions workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml))
builds and publishes to Pages on every push to `main`. It enables Pages
automatically on first run. In the repo, **Settings → Pages → Source** should be
**GitHub Actions** (the workflow sets this up; confirm it once).

The Vite `base` is set to `/AstroBotany_calibration_image_sharing_and_analysis/`
for project-pages hosting — change it in `vite.config.ts` if the repo is renamed.

## Notes / limits

- Epicollect5 API rate limits: ~5 requests/min for entries (the app paginates
  50 at a time with a **Load more** button) and a higher limit for media.
- The Epicollect5 API is **read-only**; contributions happen in the Epicollect5
  app. Marker analysis you compute is stored in your browser and exported in the
  manifest, not written back to Epicollect5.

## License

MIT. Contributed photos/data carry the licence set on your Epicollect5 project.
