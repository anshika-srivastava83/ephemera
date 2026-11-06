'use client';

import { useEffect, useRef, useState } from 'react';

// Scales fixed-size content down to fit its parent's width (never scales up).
// The content keeps its true pixel size, so it can still be exported unscaled.
export function ScaleToFit({ children }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [natural, setNatural] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const inner = el.firstElementChild;
    const measure = () => {
      if (!inner) return;
      const w = inner.offsetWidth;
      const h = inner.offsetHeight;
      setNatural({ w, h });
      const avail = el.parentElement?.clientWidth || w;
      setScale(Math.min(1, avail / w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [children]);

  return (
    <div
      ref={wrapRef}
      style={{
        width: natural.w ? natural.w * scale : '100%',
        height: natural.h ? natural.h * scale : undefined,
        overflow: 'hidden',
      }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 'max-content' }}>
        {children}
      </div>
    </div>
  );
}
