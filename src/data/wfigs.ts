import { useQuery } from '@tanstack/react-query';
import type { Incident } from '../types';

const URL =
  'https://services3.arcgis.com/T4QMspbfLg3qTGWY/ArcGIS/rest/services/WFIGS_Incident_Locations_Current/FeatureServer/0/query' +
  '?where=' + encodeURIComponent("IncidentTypeCategory='WF'") +
  '&outFields=' + encodeURIComponent([
    'IrwinID','IncidentName','IncidentSize','DiscoveryAcres','PercentContained',
    'FireDiscoveryDateTime','POOState','FireCause','IncidentTypeCategory',
  ].join(',')) +
  '&outSR=4326&f=geojson&resultRecordCount=2000';

interface WFIGSFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] } | null;
  properties: {
    IrwinID?: string | null;
    IncidentName?: string | null;
    IncidentSize?: number | null;
    DiscoveryAcres?: number | null;
    PercentContained?: number | null;
    FireDiscoveryDateTime?: number | null;
    POOState?: string | null;
    FireCause?: string | null;
    IncidentTypeCategory?: string | null;
  };
}

export function useUSIncidents() {
  return useQuery<Incident[]>({
    queryKey: ['wfigs'],
    queryFn: async () => {
      const r = await fetch(URL);
      if (!r.ok) throw new Error(`WFIGS ${r.status}`);
      const data = await r.json();
      return (data.features as WFIGSFeature[])
        .filter((f) => f.geometry?.coordinates)
        .map((f, i): Incident => {
          const [lon, lat] = f.geometry!.coordinates;
          const p = f.properties;
          const acres = p.IncidentSize ?? p.DiscoveryAcres ?? null;
          return {
            id: p.IrwinID ?? `wfigs-${i}`,
            name: p.IncidentName?.trim() || 'Unnamed incident',
            source: 'WFIGS',
            lat,
            lon,
            acres,
            hectares: acres != null ? acres * 0.4047 : null,
            containmentPct: p.PercentContained ?? null,
            discoveredAt: p.FireDiscoveryDateTime ? new Date(p.FireDiscoveryDateTime) : null,
            category: p.IncidentTypeCategory ?? null,
            stateOrProv: p.POOState ? p.POOState.replace(/^US-/, '') : null,
            cause: p.FireCause ?? null,
            raw: p as unknown as Record<string, unknown>,
          };
        });
    },
    refetchInterval: 10 * 60 * 1000,
  });
}
