/**
 * admin/components/Chart.jsx — Bar chart in plain SVG. Bars rise once when the chart
 * first appears; there is no hover glow. The caption carries the peak and the value under
 * the pointer, so every figure is readable from the page itself.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export function BarChart({ data = [], format = (v) => String(v), label, height = 200 }) {
  const [hover, setHover] = useState(null);

  if (!data.length) return <p className="ad-muted ad-empty">No data for this window</p>;

  const values = data.map((d) => Number(d.value) || 0);
  const max = Math.max(...values, 1);
  const width = 640;
  const padTop = 10;
  const padBottom = 24;
  const slot = width / data.length;
  const barWidth = Math.max(3, Math.min(28, slot * 0.6));
  const plot = height - padTop - padBottom;
  const every = data.length > 12 ? Math.ceil(data.length / 6) : 1;

  return (
    <figure className="ad-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="ad-chart__svg">
        <line x1="0" x2={width} y1={height - padBottom} y2={height - padBottom} className="ad-chart__base" />
        {data.map((d, i) => {
          const bh = Math.max((values[i] / max) * plot, values[i] > 0 ? 2 : 0);
          const x = i * slot + (slot - barWidth) / 2;
          const y = height - padBottom - bh;
          const dim = hover !== null && hover !== i;
          return (
            <motion.rect
              key={`${d.label}-${i}`}
              x={x}
              width={barWidth}
              className={`ad-chart__bar${i === values.indexOf(max) ? ' is-peak' : ''}`}
              style={{ opacity: dim ? 0.35 : 1 }}
              initial={{ y: height - padBottom, height: 0 }}
              animate={{ y, height: bh }}
              transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <title>{`${d.label}: ${format(values[i])}`}</title>
            </motion.rect>
          );
        })}
        {data.map((d, i) => {
          if (i % every !== 0 && i !== data.length - 1) return null;
          return (
            <text key={`lbl-${i}`} x={i * slot + slot / 2} y={height - 6} textAnchor="middle" className="ad-chart__label">
              {String(d.label).slice(5)}
            </text>
          );
        })}
      </svg>
      <figcaption className="ad-chart__caption">
        <span>{label}</span>
        <span>
          {hover !== null ? `${data[hover].label} · ${format(values[hover])}` : `Peak ${format(max)} · ${data.length} days`}
        </span>
      </figcaption>
    </figure>
  );
}
