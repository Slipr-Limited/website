/**
 * admin/components/Chart.jsx — Animated bar chart in SVG (no charting library).
 * Bars grow from the baseline when the chart appears, glow on hover, and carry a
 * tooltip. The caption states the range and peak so the figures read without hovering.
 */

import React, { useId, useState } from 'react';
import { motion } from 'framer-motion';

export function BarChart({ data = [], format = (v) => String(v), label, height = 220 }) {
  const gradientId = `bar-${useId()}`;
  const [hover, setHover] = useState(null);

  if (!data.length) return <p className="ad-muted ad-empty">No data for this window</p>;

  const values = data.map((d) => Number(d.value) || 0);
  const max = Math.max(...values, 1);
  const width = 640;
  const padX = 12;
  const padTop = 16;
  const padBottom = 26;
  const slot = (width - padX * 2) / data.length;
  const barWidth = Math.max(4, Math.min(34, slot * 0.66));
  const plot = height - padTop - padBottom;
  const ticks = [0, 0.5, 1];

  return (
    <figure className="ad-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="ad-chart__svg">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#00E8C8" />
            <stop offset="100%" stopColor="#00C2A8" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        {ticks.map((t) => {
          const y = height - padBottom - t * plot;
          return (
            <g key={t}>
              <line x1={padX} x2={width - padX} y1={y} y2={y} className="ad-chart__grid" />
              <text x={padX} y={y - 5} className="ad-chart__label">{format(max * t)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const bh = Math.max((values[i] / max) * plot, 2);
          const x = padX + i * slot + (slot - barWidth) / 2;
          const y = height - padBottom - bh;
          const active = hover === i;
          return (
            <motion.rect
              key={`${d.label}-${i}`}
              x={x}
              width={barWidth}
              rx={Math.min(6, barWidth / 2)}
              fill={`url(#${gradientId})`}
              className="ad-chart__bar"
              style={{ transformOrigin: `${x + barWidth / 2}px ${height - padBottom}px`, opacity: hover === null || active ? 1 : 0.45, filter: active ? 'drop-shadow(0 0 10px rgba(0,232,200,0.55))' : 'none' }}
              initial={{ y: height - padBottom, height: 0 }}
              animate={{ y, height: bh }}
              transition={{ duration: 0.9, delay: i * 0.025, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <title>{`${d.label}: ${format(values[i])}`}</title>
            </motion.rect>
          );
        })}
        {data.map((d, i) => {
          if (data.length > 12 && i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return null;
          const x = padX + i * slot + slot / 2;
          return (
            <text key={`lbl-${i}`} x={x} y={height - 8} textAnchor="middle" className="ad-chart__label">
              {String(d.label).slice(5)}
            </text>
          );
        })}
      </svg>
      <figcaption className="ad-small ad-muted">
        <span>{label}</span>
        <span>
          {hover !== null
            ? `${data[hover].label}: ${format(values[hover])}`
            : `Peak ${format(max)} · ${data.length} points`}
        </span>
      </figcaption>
    </figure>
  );
}
