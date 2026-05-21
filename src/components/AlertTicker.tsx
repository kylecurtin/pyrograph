import { useFireWeatherAlerts } from '../data/nws';
import { fmtClock } from '../lib/time';

export function AlertTicker() {
  const { data: alerts = [] } = useFireWeatherAlerts();
  const sorted = [...alerts].sort((a, b) => a.effective.getTime() - b.effective.getTime()).slice(0, 8);

  if (sorted.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 24, top: 116,
        zIndex: 9,
        maxWidth: 460,
        background: 'rgba(255, 26, 77, 0.05)',
        borderLeft: '2px solid var(--alert)',
        padding: '10px 14px',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="label"
        style={{
          color: 'var(--alert)',
          marginBottom: 6,
          fontSize: 9,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 5, height: 5,
            borderRadius: '50%',
            background: 'var(--alert)',
            boxShadow: '0 0 6px var(--alert)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
        {alerts.length} fire-weather alert{alerts.length !== 1 ? 's' : ''} active
      </div>
      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sorted.slice(0, 4).map((a) => (
          <div
            key={a.id}
            style={{
              fontSize: 11,
              color: 'var(--text-dim)',
              display: 'flex',
              gap: 8,
              alignItems: 'baseline',
              lineHeight: 1.35,
            }}
          >
            <span
              className="mono"
              style={{ color: 'var(--text-muted)', fontSize: 9, minWidth: 38 }}
            >
              {a.expires ? fmtClock(a.expires) : '∞'}
            </span>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={a.areaDesc}
            >
              {a.areaDesc.split(';')[0]}
            </span>
          </div>
        ))}
        {alerts.length > 4 && (
          <div className="mono" style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 2 }}>
            +{alerts.length - 4} more
          </div>
        )}
      </div>
    </div>
  );
}
