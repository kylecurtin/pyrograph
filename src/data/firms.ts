import { useQuery } from '@tanstack/react-query';
import type { Detection } from '../types';

/**
 * NASA FIRMS — VIIRS_SNPP_NRT detections for North America (lon/lat bbox), last 1 day.
 * Returns empty array if no key configured.
 *
 * CSV columns: latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,
 *              instrument,confidence,version,bright_ti5,frp,daynight
 */
const KEY = import.meta.env.VITE_FIRMS_MAP_KEY as string | undefined;

// NA bbox roughly: W,S,E,N  → -170, 15, -50, 75 (CONUS + AK + Canada)
const BBOX = '-170,15,-50,75';

export const hasFirmsKey = Boolean(KEY && KEY.length > 4);

export function useDetections() {
  return useQuery<Detection[]>({
    queryKey: ['firms', KEY],
    enabled: hasFirmsKey,
    queryFn: async () => {
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${KEY}/VIIRS_SNPP_NRT/${BBOX}/1`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`FIRMS ${r.status}`);
      const text = await r.text();
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) return [];
      const cols = lines[0].split(',');
      const idx = (name: string) => cols.indexOf(name);
      const iLat = idx('latitude'),
        iLon = idx('longitude'),
        iDate = idx('acq_date'),
        iTime = idx('acq_time'),
        iFrp = idx('frp'),
        iConf = idx('confidence'),
        iDN = idx('daynight');
      return lines.slice(1).map((line, i): Detection => {
        const c = line.split(',');
        const date = c[iDate];
        const time = c[iTime].padStart(4, '0');
        const iso = `${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:00Z`;
        const confRaw = c[iConf];
        const confidence =
          confRaw === 'h' ? 90 :
          confRaw === 'n' ? 60 :
          confRaw === 'l' ? 30 :
          confRaw ? Number(confRaw) : null;
        return {
          id: `firms-${i}`,
          lat: Number(c[iLat]),
          lon: Number(c[iLon]),
          detectedAt: new Date(iso),
          frp: c[iFrp] ? Number(c[iFrp]) : null,
          confidence,
          sensor: 'VIIRS',
          daynight: (c[iDN] as 'D' | 'N') ?? null,
        };
      });
    },
    refetchInterval: 30 * 60 * 1000,
  });
}
