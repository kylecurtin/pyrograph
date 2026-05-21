import { useUSIncidents } from '../data/wfigs';
import { useCanadaIncidents } from '../data/cwfis';
import { useFireWeatherAlerts } from '../data/nws';
import { useApp, cursorTimeMs } from '../store';
import { fmtClock } from '../lib/time';
import { hasFirmsKey } from '../data/firms';

export function Header() {
  const { data: us = [] } = useUSIncidents();
  const { data: ca = [] } = useCanadaIncidents(useApp((s) => s.showCanada));
  const { data: alerts = [] } = useFireWeatherAlerts();
  const showCanada = useApp((s) => s.showCanada);
  const showAlerts = useApp((s) => s.showAlerts);
  const showDetections = useApp((s) => s.showDetections);
  const toggle = useApp((s) => s.toggle);
  const tNow = useApp((s) => s.tNow);
  const t = useApp(cursorTimeMs);
  const atNow = Math.abs(t - tNow) < 60_000;

  const totalIncidents = us.length + (showCanada ? ca.length : 0);
  const redFlag = alerts.filter((a) => a.event === 'Red Flag Warning').length;

  return (
    <header
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 10,
        padding: '20px 28px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(10,10,11,0.85) 0%, rgba(10,10,11,0) 100%)',
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <h1
            className="display"
            style={{
              margin: 0,
              fontSize: 42,
              lineHeight: 1,
              color: 'var(--text)',
              fontVariationSettings: "'opsz' 144, 'SOFT' 30, 'WONK' 1",
            }}
          >
            Pyrograph<span style={{ color: 'var(--fire-cold)' }}>.</span>
          </h1>
          <span className="label" style={{ color: 'var(--text-dim)' }}>
            Live wildfire atlas
          </span>
        </div>
        <p
          style={{
            margin: '6px 0 0 2px',
            color: 'var(--text-muted)',
            fontSize: 12,
            fontStyle: 'italic',
            fontFamily: 'var(--font-display)',
            maxWidth: 460,
          }}
        >
          A single instrument for many sensors. {' '}
          <span className="mono" style={{ color: 'var(--text-dim)' }}>
            NIFC · CWFIS · NOAA · {hasFirmsKey ? 'NASA FIRMS' : <span style={{ color: 'var(--text-faint)' }}>NASA FIRMS (offline)</span>}
          </span>
        </p>
      </div>

      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          gap: 24,
          alignItems: 'center',
          paddingTop: 6,
        }}
      >
        <Stat label="Active fires" value={totalIncidents} accent="var(--fire-warm)" />
        <Stat label="Red flag warnings" value={redFlag} accent="var(--alert)" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 16, borderLeft: '1px solid var(--border)' }}>
          <span className="label">Cursor</span>
          <span className="mono" style={{ color: atNow ? 'var(--fire-hot)' : 'var(--text)', fontSize: 14 }}>
            {atNow ? 'NOW' : fmtClock(t)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingLeft: 12 }}>
          <Toggle on={showDetections} label="Hotspots" onClick={() => toggle('showDetections')} disabled={!hasFirmsKey} />
          <Toggle on={showAlerts} label="Alerts" onClick={() => toggle('showAlerts')} />
          <Toggle on={showCanada} label="Canada" onClick={() => toggle('showCanada')} />
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="label">{label}</span>
      <span
        className="mono"
        style={{
          fontSize: 22,
          letterSpacing: '-0.02em',
          color: accent,
          fontWeight: 500,
        }}
      >
        {value.toString().padStart(3, '0')}
      </span>
    </div>
  );
}

function Toggle({
  on, label, onClick, disabled,
}: { on: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: on ? 'var(--bg-elevated)' : 'transparent',
        border: `1px solid ${on ? 'var(--border-strong)' : 'var(--border)'}`,
        color: disabled ? 'var(--text-faint)' : on ? 'var(--text)' : 'var(--text-muted)',
        padding: '6px 10px',
        fontFamily: 'var(--font-body)',
        fontSize: 10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderRadius: 2,
        transition: 'all 120ms ease',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 6, height: 6,
          borderRadius: '50%',
          background: on && !disabled ? 'var(--fire-hot)' : 'var(--text-faint)',
          marginRight: 7,
          verticalAlign: 'middle',
          boxShadow: on && !disabled ? '0 0 6px var(--fire-hot)' : 'none',
        }}
      />
      {label}
    </button>
  );
}
