'use client';

import { MotionConfig } from 'framer-motion';

// Honors the visitor's reduced-motion preference for every framer-motion animation.
export function MotionRoot({ children }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
