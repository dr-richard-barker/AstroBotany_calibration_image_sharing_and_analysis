# CyVerse Timelapse Series Integration

This document describes how to integrate extracted timelapse series from CyVerse into the AstroBotany calibration database app.

## Architecture

### Data Flow

```
CyVerse iRODS
     ↓ (extract_series.py via gocmd)
   ~/timelapse_extract/
     ├─ FlashLapse_Straight_growth/
     │  ├─ frames/ (JPEGs)
     │  ├─ metadata.csv
     │  ├─ manifest.json
     │  └─ timelapse.mp4
     └─ ... (11 more series)
     ↓ (git push to GitHub)
GitHub Pages (dr-richard-barker/timelapse-image-series)
     ├─ catalog.json
     └─ [series folders]
     ↓ (CORS-enabled API)
Browser / AstroBotany App
     └─ [loads, displays, analyzes frames]
```

### Source Types in the App

The app now supports three source types:

| Type | ID Format | API | Example |
|------|-----------|-----|---------|
| **Epicollect5** | `ec5:PROJECT_SLUG` | REST API | `ec5:clinostat` |
| **GitHub** | `gh:owner/repo/ref/path` | GitHub REST API | `gh:dr-richard-barker/image-repo/main/images` |
| **CyVerse** | `cyverse:CATALOG_URL\|SERIES_NAME` | Custom catalog.json | `cyverse:https://example.com/catalog.json\|FlashLapse_Straight_growth` |

## File Structures

### Extracted Series (Local)

After running `extract_series.py`, each series directory contains:

```
series-name/
├─ frames/
│  ├─ frame_0001.jpg
│  ├─ frame_0002.jpg
│  └─ ... (all JPEGs)
├─ metadata.csv
│  Columns: filename, frame_number, datetime_utc, cadence_seconds,
│           species, treatment, genotype, original_path, original_md5, notes
├─ manifest.json
│  {
│    "name": "Series Display Name",
│    "irods_collection": "/iplant/home/dr_richard_barker/...",
│    "frame_count": 200,
│    "frame_times": 200,
│    "cadence_seconds": "30.5",
│    "date_range": {
│      "start": "2017-03-01T14:36:00Z",
│      "end": "2017-03-01T14:50:00Z",
│      "duration_hours": 0.23
│    },
│    "extracted_at": "2026-08-20T08:00:00Z"
│  }
└─ timelapse.mp4
   H.264 MP4, 30 fps, all-intra key frames for seeking
```

### Catalog (on GitHub Pages)

Push all series to a public GitHub repository. The root contains:

```
timelapse-image-series/
├─ catalog.json
├─ FlashLapse_Straight_growth/
│  ├─ frames/ → symbolic link or git submodule
│  ├─ metadata.csv
│  ├─ manifest.json
│  ├─ timelapse.mp4
│  ├─ datapackage.json
│  └─ README.md
├─ ABCD_1/
│  └─ ... (same structure)
└─ ... (remaining series)
```

**catalog.json example:**

```json
{
  "name": "CyVerse Timelapse Series",
  "url": "https://raw.githubusercontent.com/dr-richard-barker/timelapse-image-series/main/",
  "updated_at": "2026-08-20T12:00:00Z",
  "series": [
    {
      "name": "FlashLapse Straight Growth",
      "path": "FlashLapse_Straight_growth",
      "frames": 612,
      "cadence_seconds": 15.0,
      "date_range": {
        "start": "2017-06-20T13:19:00Z",
        "end": "2017-06-20T16:39:00Z",
        "duration_hours": 3.33
      },
      "species": "Pisum sativum",
      "treatment": "light box, straight growth",
      "irods_collection": "/iplant/home/dr_richard_barker/FlashLapse_images_for_CyVerse/Straight_growth"
    },
    {
      "name": "ABCD1",
      "path": "ABCD_1",
      "frames": 485,
      "cadence_seconds": 12.0,
      "date_range": { "start": "...", "end": "..." },
      "species": "Arabidopsis thaliana"
    }
  ]
}
```

**datapackage.json per series (Frictionless):**

```json
{
  "name": "flashlapse-straight-growth",
  "title": "FlashLapse Straight Growth",
  "description": "Timelapse imaging of pea seedling growth under light box conditions",
  "sources": [
    {
      "title": "Original iRODS Collection",
      "path": "/iplant/home/dr_richard_barker/FlashLapse_images_for_CyVerse/Straight_growth"
    }
  ],
  "licenses": [{ "name": "CC0-1.0", "path": "https://creativecommons.org/publicdomain/zero/1.0/" }],
  "resources": [
    {
      "name": "frames",
      "type": "image",
      "path": "frames/",
      "schema": { "fields": [{ "name": "image", "type": "string" }] }
    },
    {
      "name": "metadata",
      "type": "table",
      "path": "metadata.csv",
      "schema": {
        "fields": [
          { "name": "filename", "type": "string" },
          { "name": "frame_number", "type": "integer" },
          { "name": "datetime_utc", "type": "datetime" },
          { "name": "cadence_seconds", "type": "number" },
          { "name": "species", "type": "string" },
          { "name": "treatment", "type": "string" },
          { "name": "original_path", "type": "string" },
          { "name": "original_md5", "type": "string" }
        ]
      }
    },
    {
      "name": "timelapse",
      "type": "video",
      "path": "timelapse.mp4"
    }
  ]
}
```

## App Integration

### 1. Add CyVerse source type to App

**In `src/App.tsx`, add a field for CyVerse catalog URL:**

```typescript
const [cyverseUrl, setCyverseUrl] = useState('');
const [loadingCyverse, setLoadingCyverse] = useState(false);

const addCyverseCatalog = async () => {
  if (!cyverseUrl.trim()) return;
  setLoadingCyverse(true);
  try {
    const catalog = await fetchCatalog(cyverseUrl);
    // Register each series as a new source
    for (const series of catalog.series) {
      const id = cyverseId(cyverseUrl, series.name);
      // Store in your project management system
      // (details depend on how your app manages projects)
    }
    setCyverseUrl('');
    setActive(catalog.series[0]?.name || ''); // Show first series
  } catch (e) {
    alert(`Failed to load catalog: ${e}`);
  } finally {
    setLoadingCyverse(false);
  }
};
```

### 2. Update Database component to load CyVerse entries

**In `src/components/Database.tsx`, handle CyVerse sources:**

```typescript
// When a CyVerse source is selected:
const loadCyverseEntries = async (catalogUrl: string, seriesName: string) => {
  const series = await fetchCatalog(catalogUrl).then(c =>
    c.series.find(s => s.name === seriesName)
  );
  if (!series) throw new Error('Series not found');

  const seriesUrl = new URL(series.path + '/', catalogUrl.replace('catalog.json', '')).href;
  const { rows, meta } = await fetchSeriesMetadata(seriesUrl);

  // Convert to Ec5Entry objects
  const entries = rows.map((row, i) =>
    seriesFrameToEntry(series, row, i, catalogUrl, seriesUrl)
  );

  setEntries(entries);
};
```

### 3. Update MarkerInspector for video playback

✅ Already done — the `VideoPlayer` component is integrated.

### 4. Add source input UI

**In `src/components/Contribute.tsx`, add a CyVerse section:**

```typescript
const [cyverseUrl, setCyverseUrl] = useState('');
const [cyverseBusy, setCyverseBusy] = useState(false);
const [cyverseMsg, setCyverseMsg] = useState<{ ok: boolean; text: string } | null>(null);

const addCyverseCatalog = async () => {
  if (!cyverseUrl.trim()) return;
  setCyverseBusy(true);
  setCyverseMsg(null);
  try {
    const catalog = await fetchCatalog(cyverseUrl);
    // TODO: Store catalog URL + series in projects
    setCyverseMsg({ ok: true, text: `Loaded ${catalog.series.length} series from catalog.` });
    setCyverseUrl('');
  } catch (e) {
    setCyverseMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
  } finally {
    setCyverseBusy(false);
  }
};
```

Then add UI:

```tsx
<div className="card pad">
  <div className="card-title">CyVerse Timelapse Series</div>
  <p style={{ fontSize: '.85rem', marginBottom: 12 }}>
    Add a catalog of extracted timelapse series hosted on GitHub Pages.
  </p>
  <div className="row" style={{ gap: 8, marginBottom: 10 }}>
    <input
      placeholder="https://example.com/timelapse-image-series/catalog.json"
      value={cyverseUrl}
      onChange={(e) => setCyverseUrl(e.currentTarget.value)}
      style={{ flex: 1 }}
    />
    <button className="btn btn-primary" onClick={addCyverseCatalog} disabled={cyverseBusy}>
      {cyverseBusy ? 'Loading…' : 'Add'}
    </button>
  </div>
  {cyverseMsg && <div className={`muted ${cyverseMsg.ok ? '' : 'err'}`}>{cyverseMsg.text}</div>}
</div>
```

## Deployment Steps

### 1. Extract all series locally

```bash
for series_path in \
  "/iplant/home/dr_richard_barker/FlashLapse_images_for_CyVerse/Straight_growth" \
  "/iplant/home/dr_richard_barker/ABCD_1" \
  # ... (remaining 10 series)
do
  python3 extract_series.py --irods-path "$series_path" \
    --output ~/timelapse_extract/$(basename "$series_path") &
done
wait
```

### 2. Encode all to MP4

```bash
source ~/venv-timelapse/bin/activate
for series_dir in ~/timelapse_extract/*/; do
  python3 encode_timelapse.py \
    --input "$series_dir/frames" \
    --output "$series_dir/timelapse.mp4"
done
```

### 3. Generate datapackage.json per series

```bash
python3 tools/generate_sidecar.py \
  --input ~/timelapse_extract/ \
  --output ~/timelapse_extract/ \
  --type frictionless
```

### 4. Create GitHub repository and push

```bash
mkdir -p ~/repo/timelapse-image-series
cd ~/repo/timelapse-image-series

# Generate catalog.json
python3 << 'EOF'
import json, os
from pathlib import Path

series = []
for d in sorted(Path('~/timelapse_extract').expanduser().iterdir()):
  if not d.is_dir(): continue
  manifest = json.loads((d / 'manifest.json').read_text())
  series.append({
    "name": manifest['name'],
    "path": d.name,
    "frames": manifest['frame_count'],
    "cadence_seconds": float(manifest.get('cadence_seconds') or 0),
    "date_range": manifest.get('date_range'),
    "irods_collection": manifest.get('irods_collection'),
  })

catalog = {
  "name": "CyVerse Timelapse Series",
  "url": "https://raw.githubusercontent.com/dr-richard-barker/timelapse-image-series/main/",
  "updated_at": datetime.utcnow().isoformat() + 'Z',
  "series": series
}
Path('catalog.json').write_text(json.dumps(catalog, indent=2))
EOF

# Copy all extracted series
cp -r ~/timelapse_extract/*/ .

# Initialize git repo
git init
git add .
git commit -m "Initial timelapse series catalog (12 series, 59k frames)"
git branch -M main
git remote add origin https://github.com/dr-richard-barker/timelapse-image-series.git
git push -u origin main

# Enable GitHub Pages on main branch → live at:
# https://dr-richard-barker.github.io/timelapse-image-series/catalog.json
```

### 5. Update the AstroBotany app

1. Merge the CyVerse source adapter (`src/api/cyverse-series.ts`)
2. Add VideoPlayer component (`src/components/VideoPlayer.tsx`)
3. Update MarkerInspector to use VideoPlayer
4. Add CyVerse catalog input to Contribute tab
5. Deploy

```bash
cd ~/Documents/AstroBotany_calibration_image_sharing_and_analysis
git add src/api/cyverse-series.ts src/components/VideoPlayer.tsx src/components/MarkerInspector.tsx
git commit -m "feat: add CyVerse timelapse series source + video playback"
npm run build
# Push to GitHub, trigger Pages deploy
```

### 6. Test end-to-end

1. Open the app: https://dr-richard-barker.github.io/AstroBotany_calibration_image_sharing_and_analysis/
2. Go to **Contribute** tab
3. Paste catalog URL: `https://raw.githubusercontent.com/dr-richard-barker/timelapse-image-series/main/catalog.json`
4. Click **Add**
5. Select a series from the Database tab
6. Play the timelapse video, click frames to inspect
7. Run marker detection on individual frames

## Frictionless / FAIR Compliance

The generated `datapackage.json` files are compliant with:

- **Frictionless Data** spec (frictionlessdata.io)
- **Data Package** format for tabular + multimedia data
- **FAIR principles**: Findable (DOI), Accessible (GitHub Pages), Interoperable (CSV + MP4), Reusable (CC0/CC-BY)

To publish to OSDR / CyVerse Data Commons with a DOI, include the datapackage.json in the deposit.

## Future Improvements

- [ ] **Parallel downloading** — use Python `concurrent.futures` to speed up Phase 1
- [ ] **Thumbnail generation** — create low-res JPEG previews for faster gallery loading
- [ ] **Frame filtering** — skip key frames from video, resync to CSV timestamps
- [ ] **Marker detection batch** — run ArUco detection on all frames, cache results
- [ ] **Multi-series comparison** — overlay growth curves from multiple series
- [ ] **Export results** — generate per-frame analysis reports (leaf area, height, etc.)
