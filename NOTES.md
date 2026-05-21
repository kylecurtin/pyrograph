# Design notes & lessons

Working journal — decisions made, gotchas hit, alternatives considered but rejected. Read this before changing things.

## Architectural decisions

**One global state, every view subscribed.** Zustand store holds `{ tCursor, selectedIncidentId, hoveredIncidentId, toggles }`. No prop drilling, no per-component fetch state. TanStack Query owns the data cache; Zustand owns the UI state. The seam is explicit.

**Time is a derived value, not stored.** The store has `tNow` (refreshed every 30s) and `cursorPct` (0..1). The actual cursor time is `tNow - (1 - cursorPct) * windowMs`. This means moving "now" forward doesn't require re-anchoring the cursor — it stays at its relative position.

**Map clicks open panels; X button closes them.** Initial design had empty-map clicks call `select(null)`. Found during verification that this conflicted with "explore the map" gestures — every pan + click would dismiss your selection. Removed the else branch. The X button on the panel is the only close path.

**Two-series histogram, not one weighted blend.** First attempt weighted detections at 0.1× to keep incidents visible. Looked wrong: detection bursts at satellite passes were the most informative signal. Switched to two independent series (incidents above midline, detections below) with independent y-scales. The temporal pattern of VIIRS overpasses is now visible.

**Detection markers have two layers (halo + core).** A single bright dot at low FRP was hard to see at zoom 3-4. Adding a blurred halo underneath gives a glow that reads at any zoom without inflating the actual hit area.

**Incident markers have an invisible hit layer.** The visible incident circle is 3-9px (sized by acres). Too small for reliable clicking. The `incidents-hit` layer (opacity 0.001, 14-44px radius) sits on top as the only `interactiveLayerId` — clicks land easily but visuals stay tight.

## Data gotchas

**WFIGS field names.** `DailyAcres` doesn't exist; the API returns a generic 400 if you ask for it. Use `IncidentSize` (current size) or `DiscoveryAcres` (initial). See `src/data/wfigs.ts:9`. Full field list in the memory file `reference-wfigs-fields`.

**CWFIS may CORS-fail in some browsers.** Natural Resources Canada's WFS endpoint sometimes returns no `Access-Control-Allow-Origin` header. `src/data/cwfis.ts` wraps the fetch in try/catch and returns `[]` on failure rather than throwing. If Canadian fires aren't showing, that's why — incidents from the US still work.

**NWS requires a User-Agent.** Their docs ask for `name email@example.com` format. Browsers send their own UA on top, which NWS accepts. We send `pyrograph-dashboard (local-dev)` as a courtesy.

**FIRMS confidence is mixed-type.** The `confidence` column is sometimes `'h'`/`'n'`/`'l'` (VIIRS) and sometimes a 0-100 integer (MODIS). `src/data/firms.ts` maps letters to {h:90, n:60, l:30}.

**FIRMS acq_time is HHMM as a string.** Needs left-pad to 4 chars then split into hh+mm. CSV value `529` → `05:29 UTC`.

## Map style

**Custom MapLibre style, not Mapbox URL.** Built inline in `MapCanvas.tsx`. Two raster sources (CARTO `dark_nolabels` base + `dark_only_labels` overlay at 55% opacity). Dimming the labels keeps the fire markers as the visual focus. No API key needed.

**Glyphs URL is set to demotiles.maplibre.org/font/...** because MapLibre's style spec requires it even when we don't use any text layers. Removing it triggers warnings in some MapLibre versions.

## Typography

Fraunces (display, variable opsz axis) is the only "personality" font. Used at large sizes with high opsz for editorial gravitas. Geist handles body text. JetBrains Mono handles all numbers — `font-variant-numeric: tabular-nums` so values don't jitter on update.

All three are free via Fontsource. No Google Fonts CDN dependency at runtime.

## Performance notes

- WFIGS request size is ~1 MB on the wire for 300+ incidents (with all fields). Selecting specific `outFields` would cut it to ~150 KB.
- MapLibre bundle is the bulk: 786 KB raw / 210 KB gzipped. Cost of the map.
- Total production gzip: ~375 KB (CSS + app + map + fonts). Well under Firebase free quotas.
- Detection layer: at 800-1000 dots, no perceptible lag. MapLibre's GeoJSON pipeline is fine up to ~10k points.

## What was tried and rejected

- **Mapbox-style URL for CARTO** (`basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`). It loaded, but MapLibre choked on some Mapbox-specific style spec extensions. Inline raster style is more robust.
- **OpenFreeMap** (`tiles.openfreemap.org/styles/dark`). Looked great but ran slow during testing; might revisit for Phase 2.
- **Single weighted histogram series** — see "two-series histogram" above.
- **StrictMode in dev** — removed during debugging the panel-close race. Turned out unrelated, but never re-added. Safe to add back.

## Deployment

- `firebase.json` uses immutable cache (`max-age=31536000`) for hashed assets and `max-age=300` for `index.html`. Standard Vite SPA pattern.
- The FIRMS key in `.env.local` gets inlined into the built JS bundle as plain text. For a sandbox project this is acceptable — the key is email-bound, rate-limited, and the dashboard is public anyway. If you want it private, proxy FIRMS requests through a Firebase Function (would require Blaze plan).
- `.firebaserc` pins to `kyle-sandbox24`. If you ever need to point at a different project: `firebase use --add`.

## Future ideas (Phase 2+)

- **Animated wind particle field.** NWS gridpoint forecast at ~25 km resolution → interpolated to a sparse vector grid → particle streaks rendered as MapLibre's custom layer (WebGL). Cambecc's earth.nullschool.net is the reference.
- **Brush-to-filter on scrubber.** Drag a range to select a time window, filter map + detail accordingly.
- **Per-incident growth curve** in the detail panel. Would require GACC daily situation reports or NIFC's IRWIN archive — neither is real-time.
- **Satellite imagery underlay.** GIBS (NASA Global Imagery Browse Services) has free WMTS tiles for VIIRS true-color imagery. Toggle button in the header.
- **Mobile layout.** Currently desktop-only. Would need to rework the panel into a bottom sheet and shrink the scrubber.
