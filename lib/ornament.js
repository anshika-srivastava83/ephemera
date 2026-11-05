// Shared flourish geometry, echoing the swirls and diamond ornaments in the
// Mehfil logo. Used by the React component and by the standalone print page.
export const FLOURISH_VIEWBOX = '0 0 240 24';
export const FLOURISH_PATH_LEFT =
  'M6 12 H66 C80 12 85 12 92 8 C97 5 103 6 102 10 C101 13.500 96 13.500 96.500 10.500';
export const FLOURISH_DIAMOND = 'M120 6.500 L125.500 12 L120 17.500 L114.500 12 Z';

export function flourishSvgMarkup({ color = 'currentColor', width = '180', height = '18' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${FLOURISH_VIEWBOX}" width="${width}" height="${height}" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="${FLOURISH_PATH_LEFT}"/><path d="${FLOURISH_PATH_LEFT}" transform="translate(240 0) scale(-1 1)"/><path d="${FLOURISH_DIAMOND}" fill="${color}" stroke="none"/><circle cx="108" cy="12" r="1.100" fill="${color}" stroke="none"/><circle cx="132" cy="12" r="1.100" fill="${color}" stroke="none"/></svg>`;
}
