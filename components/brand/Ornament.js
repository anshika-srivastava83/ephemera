import {
  FLOURISH_VIEWBOX,
  FLOURISH_PATH_LEFT,
  FLOURISH_DIAMOND,
} from '../../lib/ornament';

/** Calligraphic divider: tapering lines, curls and a centre diamond, like the logo's flourishes. */
export function FlourishDivider({ className = '', width = 180 }) {
  return (
    <svg
      viewBox={FLOURISH_VIEWBOX}
      width={width}
      height={(width * 24) / 240}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
      className={`text-sepia ${className}`}
    >
      <path d={FLOURISH_PATH_LEFT} />
      <path d={FLOURISH_PATH_LEFT} transform="translate(240 0) scale(-1 1)" />
      <path d={FLOURISH_DIAMOND} fill="currentColor" stroke="none" />
      <circle cx="108" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="132" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Small rotated-square bullet, the "diamond" from the logo. */
export function Diamond({ className = '' }) {
  return <span aria-hidden="true" className={`ornate-diamond ${className}`} />;
}
