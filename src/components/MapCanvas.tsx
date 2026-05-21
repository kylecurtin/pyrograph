import { useMemo, useState, useCallback } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent, StyleSpecification } from 'maplibre-gl';
import { useApp, cursorTimeMs } from '../store';
import { useUSIncidents } from '../data/wfigs';
import { useCanadaIncidents } from '../data/cwfis';
import { useFireWeatherAlerts } from '../data/nws';
import { useDetections, hasFirmsKey } from '../data/firms';
import type { Incident } from '../types';

const STYLE: StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
    },
    'carto-labels': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
    },
  },
  layers: [
    { id: 'carto-base', type: 'raster', source: 'carto' },
    {
      id: 'carto-labels',
      type: 'raster',
      source: 'carto-labels',
      paint: { 'raster-opacity': 0.55 },
    },
  ],
};

function incidentsToFC(incidents: Incident[], tMs: number): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: incidents
      .filter((i) => !i.discoveredAt || i.discoveredAt.getTime() <= tMs)
      .map((i) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [i.lon, i.lat] },
        properties: {
          id: i.id,
          name: i.name,
          source: i.source,
          acres: i.acres ?? 0,
          containment: i.containmentPct ?? 0,
          ageHours: i.discoveredAt
            ? Math.max(0, (tMs - i.discoveredAt.getTime()) / 36e5)
            : 9999,
        },
      })),
  };
}

export function MapCanvas() {
  const { data: us = [] } = useUSIncidents();
  const { showCanada, showAlerts, showDetections } = useApp();
  const { data: ca = [] } = useCanadaIncidents(showCanada);
  const { data: alerts = [] } = useFireWeatherAlerts();
  const { data: detections = [] } = useDetections();

  const tMs = useApp(cursorTimeMs);
  const selectedId = useApp((s) => s.selectedIncidentId);
  const select = useApp((s) => s.selectIncident);
  const hoverIncident = useApp((s) => s.hoverIncident);

  const allIncidents = useMemo(() => [...us, ...ca], [us, ca]);

  const incidentsFC = useMemo(() => incidentsToFC(allIncidents, tMs), [allIncidents, tMs]);

  const detectionsFC = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: detections
        .filter((d) => d.detectedAt.getTime() <= tMs)
        .map((d) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [d.lon, d.lat] },
          properties: {
            id: d.id,
            frp: d.frp ?? 0,
            ageHrs: (tMs - d.detectedAt.getTime()) / 36e5,
          },
        })),
    }),
    [detections, tMs]
  );

  const alertsFC = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: alerts
        .filter((a) => a.geometry)
        .map((a) => ({
          type: 'Feature' as const,
          geometry: a.geometry as GeoJSON.Geometry,
          properties: { id: a.id, event: a.event, severity: a.severity },
        })),
    }),
    [alerts]
  );

  const [cursorStyle, setCursorStyle] = useState<'grab' | 'pointer'>('grab');

  const onClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (f?.properties?.id) {
        select(String(f.properties.id));
      }
      // Empty-space clicks do NOT close the panel — use the X button.
    },
    [select]
  );

  const onHover = useCallback(
    (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (f?.properties?.id) {
        setCursorStyle('pointer');
        hoverIncident(String(f.properties.id));
      } else {
        setCursorStyle('grab');
        hoverIncident(null);
      }
    },
    [hoverIncident]
  );

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Map
        initialViewState={{ longitude: -100, latitude: 48, zoom: 3.4 }}
        mapStyle={STYLE}
        cursor={cursorStyle}
        interactiveLayerIds={['incidents-hit']}
        onClick={onClick}
        onMouseMove={onHover}
        maxZoom={11}
        minZoom={2}
        attributionControl={true}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {showAlerts && (
          <Source id="alerts" type="geojson" data={alertsFC}>
            <Layer
              id="alerts-fill"
              type="fill"
              paint={{
                'fill-color': '#FF1A4D',
                'fill-opacity': 0.08,
              }}
            />
            <Layer
              id="alerts-line"
              type="line"
              paint={{
                'line-color': '#FF1A4D',
                'line-width': 1.2,
                'line-dasharray': [2, 2],
                'line-opacity': 0.75,
              }}
            />
          </Source>
        )}

        {showDetections && hasFirmsKey && (
          <Source id="detections" type="geojson" data={detectionsFC}>
            {/* Soft outer halo */}
            <Layer
              id="detections-halo"
              type="circle"
              paint={{
                'circle-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  3, ['interpolate', ['linear'], ['get', 'frp'], 0, 4, 20, 7, 100, 12, 500, 20],
                  8, ['interpolate', ['linear'], ['get', 'frp'], 0, 10, 20, 18, 100, 28, 500, 44],
                ],
                'circle-color': [
                  'interpolate', ['linear'], ['get', 'frp'],
                  0, '#FF6B1A',
                  10, '#FF9933',
                  50, '#FFCC00',
                  200, '#FFE066',
                  500, '#FFF4A3',
                ],
                'circle-opacity': [
                  'interpolate', ['linear'], ['get', 'ageHrs'],
                  0, 0.32,
                  6, 0.22,
                  24, 0.05,
                ],
                'circle-blur': 1.1,
              }}
            />
            {/* Bright core */}
            <Layer
              id="detections-dots"
              type="circle"
              paint={{
                'circle-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  3, ['interpolate', ['linear'], ['get', 'frp'], 0, 2, 20, 3, 100, 4.5, 500, 6.5],
                  8, ['interpolate', ['linear'], ['get', 'frp'], 0, 4, 20, 6, 100, 9, 500, 14],
                ],
                'circle-color': [
                  'interpolate', ['linear'], ['get', 'frp'],
                  0, '#FF6B1A',
                  10, '#FF9933',
                  50, '#FFCC00',
                  200, '#FFE066',
                  500, '#FFF4A3',
                ],
                'circle-opacity': [
                  'interpolate', ['linear'], ['get', 'ageHrs'],
                  0, 0.95,
                  6, 0.75,
                  24, 0.18,
                ],
                'circle-blur': 0.15,
              }}
            />
          </Source>
        )}

        <Source id="incidents" type="geojson" data={incidentsFC}>
          {/* Invisible larger hit target — easier to click */}
          <Layer
            id="incidents-hit"
            type="circle"
            paint={{
              'circle-radius': [
                'interpolate', ['exponential', 1.5], ['get', 'acres'],
                0, 14,
                100, 16,
                1000, 18,
                10000, 22,
                100000, 30,
                500000, 44,
              ],
              'circle-color': '#000',
              'circle-opacity': 0.001,
            }}
          />
          {/* Outer glow */}
          <Layer
            id="incidents-glow"
            type="circle"
            paint={{
              'circle-radius': [
                'interpolate', ['exponential', 1.5], ['get', 'acres'],
                0, 8,
                100, 12,
                1000, 18,
                10000, 28,
                100000, 44,
                500000, 64,
              ],
              'circle-color': [
                'case',
                ['>=', ['get', 'containment'], 90], '#8A6650',
                '#E63946',
              ],
              'circle-blur': 1.0,
              'circle-opacity': 0.35,
            }}
          />
          {/* Solid core */}
          <Layer
            id="incidents-fill"
            type="circle"
            paint={{
              'circle-radius': [
                'interpolate', ['exponential', 1.5], ['get', 'acres'],
                0, 3,
                100, 4,
                1000, 6,
                10000, 9,
                100000, 14,
                500000, 22,
              ],
              'circle-color': [
                'case',
                ['>=', ['get', 'containment'], 90], '#8A6650',
                ['>=', ['get', 'containment'], 50], '#FF9933',
                '#FFCC00',
              ],
              'circle-stroke-color': '#0A0A0B',
              'circle-stroke-width': 1,
              'circle-opacity': 0.95,
            }}
          />
          {/* Selected ring */}
          {selectedId && (
            <Layer
              id="incidents-selected"
              type="circle"
              filter={['==', ['get', 'id'], selectedId]}
              paint={{
                'circle-radius': 28,
                'circle-color': 'transparent',
                'circle-stroke-color': '#FFF4A3',
                'circle-stroke-width': 1.5,
                'circle-opacity': 1,
              }}
            />
          )}
        </Source>
      </Map>
    </div>
  );
}
