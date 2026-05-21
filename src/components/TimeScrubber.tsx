import { useEffect, useMemo, useRef, useState } from 'react';
import { scaleTime, scaleLinear } from 'd3-scale';
import { useApp } from '../store';
import { useUSIncidents } from '../data/wfigs';
import { useCanadaIncidents } from '../data/cwfis';
import { useDetections } from '../data/firms';
import { fmtClock, fmtDate } from '../lib/time';

const HEIGHT = 132;
const PADDING = { l: 84, r: 96, t: 14, b: 34 };

export function TimeScrubber() {
  const tNow = useApp((s) => s.tNow);
  const windowMs = useApp((s) => s.windowMs);
  const cursorPct = useApp((s) => s.cursorPct);
  const setCursor = useApp((s) => s.setCursor);
  const setNow = useApp((s) => s.setNow);
  const showCanada = useApp((s) => s.showCanada);

  const { data: us = [] } = useUSIncidents();
  const { data: ca = [] } = useCanadaIncidents(showCanada);
  const { data: detections = [] } = useDetections();

  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    const handler = () => {
      if (ref.current) setWidth(ref.current.clientWidth);
    };
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Tick clock every 30s so "now" stays current
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(i);
  }, [setNow]);

  const innerW = width - PADDING.l - PADDING.r;
  const innerH = HEIGHT - PADDING.t - PADDING.b;
  const t0 = tNow - windowMs;
  const x = useMemo(() => scaleTime().domain([t0, tNow]).range([0, innerW]), [t0, tNow, innerW]);

  // Two stacked series: incident discoveries (deep orange) + detection events (warm gold).
  // Incidents are sparse but meaningful; detections cluster around satellite passes.
  const hist = useMemo(() => {
    const bins = 96; // 15-min resolution over 24h
    const incBins = new Array(bins).fill(0);
    const detBins = new Array(bins).fill(0);
    for (const i of [...us, ...ca]) {
      if (!i.discoveredAt) continue;
      const t = i.discoveredAt.getTime();
      if (t < t0 || t > tNow) continue;
      const b = Math.min(bins - 1, Math.floor(((t - t0) / windowMs) * bins));
      incBins[b] += 1;
    }
    for (const d of detections) {
      const t = d.detectedAt.getTime();
      if (t < t0 || t > tNow) continue;
      const b = Math.min(bins - 1, Math.floor(((t - t0) / windowMs) * bins));
      detBins[b] += 1;
    }
    return { incBins, detBins };
  }, [us, ca, detections, t0, tNow, windowMs]);

  // Independent scales so neither dominates the other visually
  const maxInc = Math.max(1, ...hist.incBins);
  const maxDet = Math.max(1, ...hist.detBins);
  const incHeight = innerH * 0.55;
  const detHeight = innerH * 0.45;
  const yInc = scaleLinear().domain([0, maxInc]).range([incHeight, 0]);
  const yDet = scaleLinear().domain([0, maxDet]).range([0, detHeight]);

  const cursorX = cursorPct * innerW;
  const cursorTime = t0 + cursorPct * windowMs;

  // Drag handling
  const dragging = useRef(false);
  const updateFromEvent = (clientX: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = clientX - rect.left - PADDING.l;
    setCursor(px / innerW);
  };

  // Hour ticks
  const ticks = useMemo(() => {
    const stepMs = 3 * 60 * 60 * 1000; // every 3h
    const arr: number[] = [];
    for (let t = Math.ceil(t0 / stepMs) * stepMs; t <= tNow; t += stepMs) {
      arr.push(t);
    }
    return arr;
  }, [t0, tNow]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        height: HEIGHT,
        background: 'linear-gradient(180deg, rgba(10,10,11,0.0) 0%, rgba(10,10,11,0.85) 35%, rgba(10,10,11,0.96) 100%)',
        borderTop: '1px solid var(--border)',
        zIndex: 10,
      }}
    >
      <svg
        ref={ref}
        width="100%"
        height={HEIGHT}
        style={{ display: 'block', cursor: dragging.current ? 'grabbing' : 'crosshair', touchAction: 'none' }}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as Element).setPointerCapture(e.pointerId);
          updateFromEvent(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) updateFromEvent(e.clientX);
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          (e.target as Element).releasePointerCapture(e.pointerId);
        }}
      >
        <g transform={`translate(${PADDING.l},${PADDING.t})`}>
          {/* Baseline */}
          <line
            x1={0} y1={innerH} x2={innerW} y2={innerH}
            stroke="var(--border)" strokeWidth={1}
          />

          {/* Midline */}
          <line
            x1={0} y1={incHeight} x2={innerW} y2={incHeight}
            stroke="var(--border)" strokeWidth={0.5} opacity={0.6}
          />

          {/* Incident discovery bars (above midline, deep orange) */}
          {hist.incBins.map((c, i) => {
            if (c === 0) return null;
            const bw = innerW / hist.incBins.length;
            const bx = i * bw;
            const past = (t0 + (i / hist.incBins.length) * windowMs) <= cursorTime;
            const top = yInc(c);
            return (
              <rect
                key={`i${i}`}
                x={bx + 0.5}
                y={top}
                width={Math.max(0.5, bw - 1)}
                height={incHeight - top}
                fill="var(--fire-cold)"
                opacity={past ? 0.9 : 0.25}
                rx={0.5}
              />
            );
          })}

          {/* Detection bars (below midline, gold, hanging down) */}
          {hist.detBins.map((c, i) => {
            if (c === 0) return null;
            const bw = innerW / hist.detBins.length;
            const bx = i * bw;
            const past = (t0 + (i / hist.detBins.length) * windowMs) <= cursorTime;
            const h = yDet(c);
            return (
              <rect
                key={`d${i}`}
                x={bx + 0.5}
                y={incHeight}
                width={Math.max(0.5, bw - 1)}
                height={h}
                fill="var(--fire-hot)"
                opacity={past ? 0.85 : 0.25}
                rx={0.5}
              />
            );
          })}

          {/* Series labels */}
          <text
            x={4} y={10}
            fontSize={8} fontFamily="var(--font-body)"
            fill="var(--text-faint)"
            style={{ letterSpacing: '0.14em', textTransform: 'uppercase' }}
          >
            Incidents
          </text>
          <text
            x={4} y={incHeight + 12}
            fontSize={8} fontFamily="var(--font-body)"
            fill="var(--text-faint)"
            style={{ letterSpacing: '0.14em', textTransform: 'uppercase' }}
          >
            Detections
          </text>

          {/* Hour ticks */}
          {ticks.map((t) => {
            const tx = x(t);
            const isNow = Math.abs(t - tNow) < 30 * 60 * 1000;
            return (
              <g key={t}>
                <line
                  x1={tx} y1={innerH} x2={tx} y2={innerH + 5}
                  stroke="var(--text-muted)" strokeWidth={1}
                />
                <text
                  x={tx} y={innerH + 18}
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  fill={isNow ? 'var(--text-dim)' : 'var(--text-muted)'}
                  textAnchor="middle"
                >
                  {fmtClock(t)}
                </text>
              </g>
            );
          })}

          {/* Date marker at left */}
          <text
            x={0} y={innerH + 30}
            fontSize={9}
            fontFamily="var(--font-body)"
            fill="var(--text-muted)"
            textAnchor="start"
            style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}
          >
            {fmtDate(t0)}
          </text>
          <text
            x={innerW} y={innerH + 30}
            fontSize={9}
            fontFamily="var(--font-body)"
            fill="var(--text-muted)"
            textAnchor="end"
            style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}
          >
            {fmtDate(tNow)}
          </text>

          {/* Cursor line */}
          <line
            x1={cursorX} y1={-PADDING.t} x2={cursorX} y2={innerH + 10}
            stroke="var(--fire-hot)" strokeWidth={1}
            strokeDasharray="0"
            opacity={0.85}
          />
          {/* Cursor glow */}
          <line
            x1={cursorX} y1={0} x2={cursorX} y2={innerH}
            stroke="var(--fire-hot)" strokeWidth={4}
            opacity={0.18}
          />

          {/* Cursor knob */}
          <g transform={`translate(${cursorX}, ${innerH})`}>
            <circle r={6} fill="var(--fire-hot)" stroke="var(--bg)" strokeWidth={2} />
            <circle r={11} fill="none" stroke="var(--fire-hot)" strokeWidth={1} opacity={0.4} />
          </g>

          {/* Cursor time chip — top */}
          <g transform={`translate(${Math.max(40, Math.min(innerW - 40, cursorX))}, -10)`}>
            <rect
              x={-46} y={-12} width={92} height={20}
              fill="var(--bg)" stroke="var(--fire-hot)" strokeWidth={1}
            />
            <text
              x={0} y={2}
              fontFamily="var(--font-mono)" fontSize={11}
              fill="var(--fire-hot)" textAnchor="middle"
            >
              {fmtClock(cursorTime)} {cursorPct >= 0.997 ? '· NOW' : ''}
            </text>
          </g>
        </g>

        {/* Left label block */}
        <g transform={`translate(20, ${PADDING.t + 4})`}>
          <text
            fontSize={9} fontFamily="var(--font-body)"
            fill="var(--text-muted)"
            style={{ letterSpacing: '0.16em', textTransform: 'uppercase' }}
          >
            Time cursor
          </text>
          <text
            y={20}
            fontSize={11} fontFamily="var(--font-display)"
            fontStyle="italic"
            fill="var(--text-dim)"
          >
            drag to scrub
          </text>
        </g>

        {/* Right preset buttons */}
        <g transform={`translate(${width - PADDING.r + 8}, ${PADDING.t + 4})`}>
          {[
            { label: '−24h', pct: 0 },
            { label: '−6h', pct: 0.75 },
            { label: '−1h', pct: 23 / 24 },
            { label: 'NOW', pct: 1 },
          ].map((b, i) => (
            <g
              key={b.label}
              transform={`translate(0, ${i * 18})`}
              style={{ cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); setCursor(b.pct); }}
            >
              <rect x={0} y={-9} width={70} height={14} fill="transparent" />
              <text
                fontSize={10} fontFamily="var(--font-mono)"
                fill={Math.abs(cursorPct - b.pct) < 0.005 ? 'var(--fire-hot)' : 'var(--text-muted)'}
                style={{ letterSpacing: '0.08em' }}
              >
                {b.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
