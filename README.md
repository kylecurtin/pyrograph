# Pyrograph

Live wildfire atlas. A single time cursor and a single map drive views over four free data sources: NIFC WFIGS (US incidents), Canada CWFIS (Canadian active fires), NASA FIRMS (satellite hotspot detections), and NOAA NWS (Red Flag warnings + per-point forecasts).

Built in Vite + React + TypeScript with MapLibre GL, Motion, D3, Zustand, and TanStack Query.

## The idea

A wildfire isn't a row in a table — it's one physical process observed at different scales by different agencies. The dashboard makes that one underlying thing visible by reducing everything to a single state:

```
{ tCursor, selectedIncident, bbox }
```

Every view (map, scrubber, detail panel, header counts) subscribes to that state. Drag the time cursor and every view updates in lockstep. No tabs, no "refresh" — time is the only navigation.

## Running locally

```bash
npm install
cp .env.example .env.local         # then paste your FIRMS key
npm run dev                         # http://localhost:5173
```

The dashboard works **without** the FIRMS key — incidents and NWS alerts still render, just no satellite hotspot detections. To light up the detection layer, get a free key in ~60 seconds at https://firms.modaps.eosdis.nasa.gov/api/map_key/ and paste it into `.env.local` as `VITE_FIRMS_MAP_KEY=...`.

## Data sources

| Source | What it gives | Key needed? | Refresh |
|---|---|---|---|
| [NIFC WFIGS](https://data-nifc.opendata.arcgis.com/) | US active incidents (name, acres, containment, discovery date) | no | every 10 min |
| [NRCan CWFIS](https://cwfis.cfs.nrcan.gc.ca/) | Canadian active fires | no | every 30 min |
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/) | VIIRS satellite hotspot detections (last 24h) | free key | every 30 min |
| [NOAA NWS](https://www.weather.gov/documentation/services-web-api) | Red Flag Warnings + per-point forecasts | no | every 10 min |

All four are tax-funded public data with no cost and no quota issues for personal use.

## Architecture

```
src/
├── main.tsx               QueryClient bootstrap + font imports
├── App.tsx                Layout: map + chrome + scrubber + panel
├── store.ts               Zustand: tCursor, selectedIncident, toggles
├── types.ts               Incident, Detection, Alert, PointForecast
├── data/
│   ├── wfigs.ts           US incidents (NIFC ArcGIS REST)
│   ├── cwfis.ts           Canadian incidents (CWFIS WFS, CORS-tolerant)
│   ├── nws.ts             NWS alerts + point forecast
│   └── firms.ts           NASA FIRMS CSV (gated on env)
├── lib/
│   ├── color.ts           FRP/acres/containment scales (d3-scale)
│   └── time.ts            relative time + acres formatters
└── components/
    ├── MapCanvas.tsx      MapLibre + CARTO dark, three GeoJSON layers
    ├── Header.tsx         Title, counts, toggles, cursor display
    ├── AlertTicker.tsx    Red Flag warnings strip (top-left)
    ├── Legend.tsx         Color/size key (bottom-left)
    ├── TimeScrubber.tsx   D3 + drag + dual histogram
    └── IncidentDetail.tsx Slide-in panel with live NWS forecast
```

### Linked views

Every component reads from the same Zustand store. When you drag the time cursor:

- `MapCanvas` recomputes the GeoJSON FeatureCollection filtered by `discoveredAt <= tCursor`
- `TimeScrubber` recolors histogram bars past vs future of the cursor
- `Header` shows the cursor time (or "NOW" when at the right edge)

When you click an incident:

- `MapCanvas` shows a selected ring around the marker
- `IncidentDetail` slides in with stats and triggers `usePointForecast(lat, lon)` from NWS

## Aesthetic decisions

- **Type:** Fraunces (variable display, opsz axis used for editorial gravitas), Geist (body), JetBrains Mono (numbers).
- **Color is meaning.** Background is near-black. Chrome is warm grays. Only fire is fire-colored (incandescent orange→gold by FRP). Red Flag alerts are crimson outlines. Wind hints are pale blue.
- **No spinners on parameter changes.** Time scrubbing and toggles update views in <16ms.

## Deployment

**Live: https://kyle-sandbox24.web.app**

Pushing to `main` triggers `.github/workflows/deploy.yml`: checkout → `npm ci` → typecheck → build → Firebase deploy. End-to-end in ~50s. CI auths to Firebase via a dedicated service account (`github-actions-deploy@kyle-sandbox24.iam.gserviceaccount.com`, `firebasehosting.admin` + `serviceUsageConsumer`) whose JSON key lives only in the GitHub secret `FIREBASE_SERVICE_ACCOUNT_KYLE_SANDBOX24`. The FIRMS map key is also a repo secret (`VITE_FIRMS_MAP_KEY`) injected at build time.

To deploy manually from a local machine instead:

```bash
npm run build
npx firebase-tools login           # one-time, opens browser
npx firebase-tools deploy          # publishes dist/ to {project}.web.app
```

`firebase.json` configures SPA rewrites and aggressive caching for hashed assets. No billing required — Firebase Hosting Spark plan stays under quota for any realistic personal use.

## Limitations / Phase 2 ideas

- The 24h FIRMS window means scrubbing past detections is meaningful, but scrubbing past incidents only filters by discovery date (their state is current, not historical).
- No wind particle field yet. NWS gridpoint forecasts could feed a sparse vector field.
- No brush-to-filter on the scrubber (drag a range, not just a point).
- Mobile layout is functional but not optimized — designed for desktop.

See [`NOTES.md`](./NOTES.md) for design decisions, gotchas, and what was tried-and-rejected.

## Credits

Data: NIFC, Natural Resources Canada, NASA FIRMS, NOAA NWS. Basemap tiles © OpenStreetMap contributors, © CARTO.
