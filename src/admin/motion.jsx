/**
 * admin/motion.jsx — The admin's motion, kept to a few purposeful moves:
 *   Fade       a short fade when a page changes
 *   CountUp    a figure rolls up to its value once, when it first appears
 * Everything respects the user's reduced-motion setting (MotionConfig in AdminApp).
 */

import React, { useEffect, useState } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';

export function Fade({ children, className = '', duration = 0.22 }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration, ease: [0.2, 0.8, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}

/** Rolls from 0 to `value` once. `format` turns the running number into text. */
export function CountUp({ value, format = (v) => Math.round(v).toLocaleString('en-NG') }) {
  const target = Number(value) || 0;
  const motionValue = useMotionValue(0);
  const [text, setText] = useState(format(0));

  useEffect(() => {
    const unsubscribe = motionValue.on('change', (v) => setText(format(v)));
    const controls = animate(motionValue, target, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return () => { controls.stop(); unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return <span>{text}</span>;
}
