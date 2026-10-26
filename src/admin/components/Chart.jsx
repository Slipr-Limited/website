/**
 * admin/components/Chart.jsx — Simple bar chart drawn in SVG. No charting library.
 * Each bar has a tooltip, and the summary line under the chart states the range and maximum,
 * so the figures are readable without hovering. Tables with the same data sit beside the charts.
 */

import React from 'react';

export function BarChart({ data = [], format = (v) => String(v), label, height = 180 }) {
  if (!data.length) return <p className="ad-muted ad-empty">No data for this window</p>;

  const values = data.map((d) => Number(d.value) || 0);
  const max = Math.max(...values, 1);
  const width = 640;
  const pad = 24;
  const slot = (width - pad * 2) / data.length;
  const barWidth = Math.max(3, slot * 0.72);
  const plot = height - pad - 8;

  return (
    <figure className="ad-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="ad-chart__svg">
        {data.map((d, i) => {
          const bh = (values[i] / max) * plot;
          const x = pad + i * slot + (slot - barWidth) / 2;
          const y = height - pad - bh;
          return (
            <rect key={`${d.label}-${i}`} x={x} y={y} width={barWidth} height={Math.max(bh, 1)} rx="2" className="ad-bar">
              <title>{`${d.label}: ${format(values[i])}`}</title>
            </rect>
          );
        })}
        <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} className="ad-axis" />
      </svg>
      <figcaption className="ad-small ad-muted">
        {label} · {data.length} points · highest {format(max)} · {data[0].label} to {data[data.length - 1].label}
      </figcaption>
    </figure>
  );
}
