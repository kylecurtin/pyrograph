import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../store';
import { useUSIncidents } from '../data/wfigs';
import { useCanadaIncidents } from '../data/cwfis';
import { usePointForecast } from '../data/nws';
import { fmtAcres, fmtRelative } from '../lib/time';

export function IncidentDetail() {
  const id = useApp((s) => s.selectedIncidentId);
  const select = useApp((s) => s.selectIncident);
  const showCanada = useApp((s) => s.showCanada);
  const { data: us = [] } = useUSIncidents();
  const { data: ca = [] } = useCanadaIncidents(showCanada);

  const incident = useMemo(
    () => [...us, ...ca].find((i) => i.id === id) ?? null,
    [us, ca, id]
  );


  const { data: forecast, isLoading: fcLoading } = usePointForecast(
    incident?.lat ?? null,
    incident?.lon ?? null
  );

  return (
    <AnimatePresence>
      {incident && (
        <motion.aside
          key={incident.id}
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 28 }}
          style={{
            position: 'absolute',
            right: 18, top: 88,
            bottom: 152,
            width: 380,
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(18px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(18px) saturate(1.3)',
            border: '1px solid var(--border-strong)',
            zIndex: 12,
            padding: '22px 24px 24px',
            overflowY: 'auto',
            color: 'var(--text)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Close */}
          <button
            onClick={() => select(null)}
            style={{
              position: 'absolute', right: 14, top: 14,
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-dim)',
              width: 26, height: 26,
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>

          {/* Source badge */}
          <div className="label" style={{ marginBottom: 8 }}>
            <span style={{ color: 'var(--fire-cold)' }}>●</span>{' '}
            {incident.source === 'WFIGS' ? 'NIFC · US' : 'CWFIS · Canada'}{' '}
            {incident.stateOrProv && (
              <span style={{ color: 'var(--text-faint)' }}>· {incident.stateOrProv}</span>
            )}
          </div>

          {/* Name */}
          <h2
            className="display"
            style={{
              margin: '4px 0 16px',
              fontSize: 30,
              lineHeight: 1.05,
              fontVariationSettings: "'opsz' 120, 'SOFT' 50, 'WONK' 1",
              color: 'var(--text)',
            }}
          >
            {incident.name}
          </h2>

          {/* Coords */}
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              marginBottom: 20,
              letterSpacing: '0.04em',
            }}
          >
            {incident.lat.toFixed(4)}°N, {Math.abs(incident.lon).toFixed(4)}°W
          </div>

          {/* Stat grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '18px 16px',
              padding: '16px 0',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <Stat label="Acres" value={fmtAcres(incident.acres)} />
            <Stat label="Hectares" value={incident.hectares != null ? fmtAcres(incident.hectares) : '—'} />
            <Stat
              label="Containment"
              value={incident.containmentPct != null ? `${Math.round(incident.containmentPct)}%` : '—'}
              accent={
                incident.containmentPct != null && incident.containmentPct >= 90
                  ? 'var(--fire-contained)'
                  : 'var(--fire-warm)'
              }
            />
            <Stat
              label="Discovered"
              value={fmtRelative(incident.discoveredAt)}
              accent="var(--text)"
            />
          </div>

          {/* Containment bar */}
          {incident.containmentPct != null && (
            <div style={{ marginTop: 16 }}>
              <div className="label" style={{ marginBottom: 6 }}>Containment</div>
              <div style={{
                height: 6, background: 'var(--border)',
                position: 'relative', overflow: 'hidden',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${incident.containmentPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--fire-cold), var(--fire-hot))',
                  }}
                />
              </div>
            </div>
          )}

          {/* Live conditions */}
          <div style={{ marginTop: 24 }}>
            <div className="label" style={{ marginBottom: 12 }}>
              Live conditions <span style={{ color: 'var(--text-faint)' }}>· NWS at fire</span>
            </div>

            {fcLoading && (
              <div className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                fetching…
              </div>
            )}

            {forecast && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: 36,
                      letterSpacing: '-0.04em',
                      color: 'var(--text)',
                      fontWeight: 500,
                    }}
                  >
                    {forecast.temperature}°{forecast.temperatureUnit}
                  </span>
                  <WindArrow direction={forecast.windDirection} speed={forecast.windSpeed} />
                </div>

                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    color: 'var(--text-dim)',
                    fontSize: 14,
                    margin: '4px 0 12px',
                    lineHeight: 1.4,
                  }}
                >
                  {forecast.shortForecast}
                </p>

                <details>
                  <summary
                    className="label"
                    style={{
                      cursor: 'pointer',
                      fontSize: 9,
                      color: 'var(--text-muted)',
                      paddingBottom: 6,
                    }}
                  >
                    Detailed forecast
                  </summary>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-dim)',
                      lineHeight: 1.6,
                      marginTop: 4,
                    }}
                  >
                    {forecast.detailedForecast}
                  </p>
                </details>
              </div>
            )}

            {!forecast && !fcLoading && (
              <div className="mono" style={{ color: 'var(--text-faint)', fontSize: 11 }}>
                Forecast unavailable for this point
                {(incident.source === 'CWFIS') && (
                  <div style={{ marginTop: 4, color: 'var(--text-faint)' }}>
                    (NWS is US-only)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cause */}
          {incident.cause && (
            <div style={{ marginTop: 22 }}>
              <div className="label" style={{ marginBottom: 4 }}>Cause</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>{incident.cause}</div>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Stat({
  label, value, accent,
}: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 6 }}>{label}</div>
      <div
        className="mono"
        style={{
          fontSize: 22,
          color: accent ?? 'var(--text)',
          letterSpacing: '-0.02em',
          fontWeight: 500,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function WindArrow({ direction, speed }: { direction: string; speed: string }) {
  // direction = "NW", "WSW", etc. — convert to degrees
  const dirMap: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5,
    SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
    W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
  };
  const deg = dirMap[direction] ?? 0;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        color: 'var(--wind)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
      }}
    >
      <svg width="18" height="18" viewBox="-9 -9 18 18">
        <g style={{ transform: `rotate(${deg + 180}deg)`, transformOrigin: 'center' }}>
          <path d="M 0 -6 L 3 4 L 0 2 L -3 4 Z" fill="currentColor" />
        </g>
      </svg>
      {speed} from {direction}
    </span>
  );
}
