/**
 * admin/motion.jsx — Animation building blocks for the admin panel.
 * Everything here is driven by framer-motion and respects the user's
 * reduced-motion setting (MotionConfig reducedMotion="user" in AdminApp).
 */

import React, { useEffect, useId, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1];

/** Fades and slides children in when they scroll into view. */
export function Reveal({ children, delay = 0, y = 14, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Container whose children appear one after another. */
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};
export const staggerItem = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } },
};

/** Animates a number from 0 up to `value` once it is visible. */
export function CountUp({ value, format = (v) => Math.round(v).toLocaleString('en-NG') }) {
  const target = Number(value) || 0;
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => format(v));
  const [text, setText] = useState(format(0));

  useEffect(() => {
    const unsubscribe = display.on('change', setText);
    return unsubscribe;
  }, [display]);

  useEffect(() => {
    const controls = animate(motionValue, target, { duration: 1.1, ease: EASE });
    return () => controls.stop();
  }, [target, motionValue]);

  return <span>{text}</span>;
}

/** Small area sparkline that draws itself in. */
export function Sparkline({ values = [], color = 'var(--ad-accent)', height = 40 }) {
  const gradientId = `spark-${useId()}`;
  if (values.length < 2) return null;
  const width = 160;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const points = values.map((v, i) => [
    (i / (values.length - 1)) * width,
    height - 4 - ((v - min) / span) * (height - 8),
  ]);
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg className="ad-spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={area} fill={`url(#${gradientId})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
      <motion.path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: EASE }} />
    </svg>
  );
}

/** Circular progress ring that fills to `percent` (0–100). */
export function Ring({ percent = 0, color = 'var(--ad-accent)', size = 72, label }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="ad-ring" style={{ width: size, height: size }} role="img" aria-label={`${label ?? ''} ${Math.round(clamped)}%`}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} className="ad-ring__track" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - clamped / 100) }}
          transition={{ duration: 1.2, ease: EASE }}
        />
      </svg>
      <span className="ad-ring__value"><CountUp value={Math.round(clamped)} format={(v) => `${Math.round(v)}%`} /></span>
    </div>
  );
}

/** Pulsing status dot. */
export function LiveDot({ tone = 'good' }) {
  return <span className={`ad-livedot ad-livedot--${tone}`} aria-hidden="true" />;
}

export { motion };
