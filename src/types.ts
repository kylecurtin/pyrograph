export interface Incident {
  id: string;
  name: string;
  source: 'WFIGS' | 'CWFIS';
  lat: number;
  lon: number;
  acres: number | null;
  hectares: number | null;
  containmentPct: number | null;
  discoveredAt: Date | null;
  category: string | null;
  stateOrProv: string | null;
  cause: string | null;
  raw?: Record<string, unknown>;
}

export interface Detection {
  id: string;
  lat: number;
  lon: number;
  detectedAt: Date;
  frp: number | null;
  confidence: number | null;
  sensor: 'VIIRS' | 'MODIS';
  daynight: 'D' | 'N' | null;
}

export interface Alert {
  id: string;
  event: string;
  severity: string;
  headline: string;
  areaDesc: string;
  effective: Date;
  expires: Date | null;
  geometry: GeoJSON.Geometry | null;
}

export interface PointForecast {
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  shortForecast: string;
  detailedForecast: string;
  isDaytime: boolean;
}
