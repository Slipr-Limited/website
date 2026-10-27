/**
 * admin/components/Chart.jsx — Revenue chart. A line is drawn across the period, over a
 * soft area. Hovering a day shows a hairline and its figure in the caption. No dots, no pulses.
 */

import React, { useId, useState } from 'react';
import { motion } from 'framer-motion';

export function BarChart({ data = [], format = (v) => String(v), label, height = 220 }) {
  const gradientId = `area-${useId()}`;
  const [hover, setHover] = useState(null);

  if (!data.length) return <p className="ad-empty">No data for this window</p>;

  const values = data.map((d) => Number(d.value) || 0);
  const max = Math.max(...values, 1);
  const width = 640;
  const padTop = 14;
  const padBottom = 26;
  const plot = height - padTop - padBottom;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const xs = values.map((_, i) => i * step);
  const ys = values.map((v) => height - padBottom - (v / max) * plot);

  const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const area = `${line} L${xs[xs.length - 1].toFixed(1)},${height - padBottom} L0,${height - padBottom} Z`;
  const every = data.length > 12 ? Math.ceil(data.length / 6) : 1;
  const peakIndex = values.indexOf(max);

  return (
    <figure className="ad-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        className="ad-chart__svg"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#00C2A8" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#00C2A8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" x2={width} y1={height - padBottom} y2={height - padBottom} className="ad-chart__base" />
        <motion.path
          d={area}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="#0E2A22"
          strokeWidth="2.25"
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
        />
        {peakIndex >= 0 && (
          <text x={xs[peakIndex]} y={ys[peakIndex] - 10} textAnchor="middle" className="ad-chart__peak">
            {format(max)}
          </text>
        )}
        {hover !== null && (
          <line x1={xs[hover]} x2={xs[hover]} y1={padTop} y2={height - padBottom} className="ad-chart__hair" />
        )}
        {data.map((d, i) => {
          const left = i === 0 ? 0 : (xs[i - 1] + xs[i]) / 2;
          const right = i === data.length - 1 ? width : (xs[i] + xs[i + 1]) / 2;
          return (
            <rect
              key={`hit-${i}`}
              x={left}
              y={0}
              width={right - left}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            >
              <title>{`${d.label}: ${format(values[i])}`}</title>
            </rect>
          );
        })}
        {data.map((d, i) => {
          if (i % every !== 0 && i !== data.length - 1) return null;
          return (
            <text key={`lbl-${i}`} x={xs[i]} y={height - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} className="ad-chart__label">
              {String(d.label).slice(5)}
            </text>
          );
        })}
      </svg>
      <figcaption className="ad-chart__caption">
        <span>{label}</span>
        <span>
          {hover !== null
            ? `${data[hover].label} · ${format(values[hover])}`
            : `Peak ${format(max)} on ${data[peakIndex].label}`}
        </span>
      </figcaption>
    </figure>
  );
}
