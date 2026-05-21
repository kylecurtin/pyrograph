export function Legend() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 168,
        left: 24,
        zIndex: 10,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid var(--border)',
        padding: '14px 16px',
        maxWidth: 240,
      }}
    >
      <div className="label" style={{ marginBottom: 10 }}>Legend</div>

      <Row>
        <Dot color="#FFCC00" size={9} />
        <span style={{ color: 'var(--text-dim)' }}>Active &lt; 50% contained</span>
      </Row>
      <Row>
        <Dot color="#FF9933" size={7} />
        <span style={{ color: 'var(--text-dim)' }}>50–90% contained</span>
      </Row>
      <Row>
        <Dot color="#8A6650" size={6} />
        <span style={{ color: 'var(--text-dim)' }}>≥ 90% contained</span>
      </Row>

      <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />

      <Row>
        <span style={{
          display: 'inline-block', width: 18, height: 10,
          border: '1px dashed #FF1A4D',
          background: 'rgba(255,26,77,0.08)',
        }} />
        <span style={{ color: 'var(--text-dim)' }}>Red Flag Warning</span>
      </Row>

      <div style={{ marginTop: 12 }}>
        <div className="label" style={{ fontSize: 9, marginBottom: 6 }}>Marker size = acres burned</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          {[
            { acres: '100', size: 4 },
            { acres: '1k', size: 6 },
            { acres: '10k', size: 9 },
            { acres: '100k', size: 14 },
          ].map((t) => (
            <div key={t.acres} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Dot color="#FFCC00" size={t.size} />
              <span className="mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{t.acres}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 11, padding: '3px 0',
    }}>{children}</div>
  );
}

function Dot({ color, size }: { color: string; size: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size * 2, height: size * 2,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 ${size * 1.5}px ${color}80`,
      }}
    />
  );
}
