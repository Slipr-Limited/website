/**
 * admin/motion.jsx — Motion for the admin panel is deliberately minimal:
 * a short fade when content changes. No bounce, no counters, no ambient animation.
 */

import React from 'react';
import { motion } from 'framer-motion';

export function Fade({ children, className = '', duration = 0.18 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, ease: 'linear' }}
    >
      {children}
    </motion.div>
  );
}
