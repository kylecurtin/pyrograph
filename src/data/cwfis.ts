import { useQuery } from '@tanstack/react-query';
import type { Incident } from '../types';

/**
 * Natural Resources Canada — CWFIS active fires WFS.
 * If CORS blocks the request from the browser, this query just returns [].
 */
const URL =
  'https://cwfis.cfs.nrcan.gc.ca/geoserver/public/ows?service=WFS' +
  '&version=2.0.0&request=GetFeature' +
  '&typeNames=public:activefires_current' +
  '&outputFormat=application/json&srsName=EPSG:4326';

interface CWFISFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    firename?: string;
    agency?: string;
    stage_of_control?: string;
    hectares?: number | string;
    startdate?: string;
    response_type?: string;
  };
}

export function useCanadaIncidents(enabled = true) {
  return useQuery<Incident[]>({
    queryKey: ['cwfis'],
    enabled,
    queryFn: async () => {
      try {
        const r = await fetch(URL);
        if (!r.ok) return [];
        const data = await r.json();
        const stageToContainment: Record<string, number> = {
          OC: 100, UC: 50, BH: 25, OOC: 0,
        };
        return (data.features as CWFISFeature[])
          .filter((f) => f.geometry?.coordinates)
          .map((f, i): Incident => {
            const [lon, lat] = f.geometry.coordinates;
            const p = f.properties;
            const hectares = p.hectares != null ? Number(p.hectares) : null;
            return {
              id: `cwfis-${p.firename ?? i}`,
              name: p.firename?.trim() || 'Unnamed (CA)',
              source: 'CWFIS',
              lat,
              lon,
              acres: hectares != null ? hectares / 0.4047 : null,
              hectares,
              containmentPct: p.stage_of_control ? stageToContainment[p.stage_of_control] ?? null : null,
              discoveredAt: p.startdate ? new Date(p.startdate) : null,
              category: 'WF',
              stateOrProv: p.agency?.toUpperCase() ?? null,
              cause: null,
              raw: p as unknown as Record<string, unknown>,
            };
          });
      } catch {
        return [];
      }
    },
    refetchInterval: 30 * 60 * 1000,
  });
}
