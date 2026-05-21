import { useQuery } from '@tanstack/react-query';
import type { Alert, PointForecast } from '../types';

const HEADERS = {
  Accept: 'application/geo+json',
  'User-Agent': 'pyrograph-dashboard (local-dev)',
};

const ALERTS_URL =
  'https://api.weather.gov/alerts/active?event=' +
  encodeURIComponent('Red Flag Warning,Fire Weather Watch,Extreme Fire Danger');

export function useFireWeatherAlerts() {
  return useQuery<Alert[]>({
    queryKey: ['nws-alerts'],
    queryFn: async () => {
      const r = await fetch(ALERTS_URL, { headers: HEADERS });
      if (!r.ok) throw new Error(`NWS alerts ${r.status}`);
      const data = await r.json();
      return (data.features as Array<{
        id: string;
        properties: {
          event: string;
          severity: string;
          headline: string;
          areaDesc: string;
          effective: string;
          expires: string | null;
        };
        geometry: GeoJSON.Geometry | null;
      }>)
        .map((f): Alert => ({
          id: f.id,
          event: f.properties.event,
          severity: f.properties.severity,
          headline: f.properties.headline,
          areaDesc: f.properties.areaDesc,
          effective: new Date(f.properties.effective),
          expires: f.properties.expires ? new Date(f.properties.expires) : null,
          geometry: f.geometry,
        }));
    },
    refetchInterval: 10 * 60 * 1000,
  });
}

export function usePointForecast(lat: number | null, lon: number | null) {
  return useQuery<PointForecast | null>({
    queryKey: ['nws-forecast', lat, lon],
    enabled: lat != null && lon != null,
    queryFn: async () => {
      if (lat == null || lon == null) return null;
      const meta = await fetch(
        `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`,
        { headers: HEADERS }
      );
      if (!meta.ok) return null;
      const metaData = await meta.json();
      const forecastUrl: string | undefined = metaData.properties?.forecast;
      if (!forecastUrl) return null;
      const fc = await fetch(forecastUrl, { headers: HEADERS });
      if (!fc.ok) return null;
      const fcData = await fc.json();
      const period = fcData.properties?.periods?.[0];
      if (!period) return null;
      return {
        temperature: period.temperature,
        temperatureUnit: period.temperatureUnit,
        windSpeed: period.windSpeed,
        windDirection: period.windDirection,
        shortForecast: period.shortForecast,
        detailedForecast: period.detailedForecast,
        isDaytime: period.isDaytime,
      };
    },
    staleTime: 30 * 60 * 1000,
  });
}
