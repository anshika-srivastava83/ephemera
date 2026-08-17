// Deterministic pseudo-random number generator so the same event + seed
// always produces the same layout (stable between page reloads), but
// different events land on different patterns.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToInt(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

// 12 named styles. Each tweaks jitter, rotation range, and spacing so the
// wall genuinely looks different from event to event.
export const LAYOUT_STYLES = [
  { id: 'scatter-loose', jitter: 0.35, rotationRange: 15, spacing: 1.15 },
  { id: 'scatter-tight', jitter: 0.2, rotationRange: 10, spacing: 0.95 },
  { id: 'grid-tilted', jitter: 0.15, rotationRange: 20, spacing: 1.0 },
  { id: 'spiral-out', jitter: 0.25, rotationRange: 12, spacing: 1.05, mode: 'spiral' },
  { id: 'cluster-corners', jitter: 0.3, rotationRange: 18, spacing: 1.1 },
  { id: 'diagonal-flow', jitter: 0.22, rotationRange: 8, spacing: 1.0 },
  { id: 'dense-collage', jitter: 0.18, rotationRange: 25, spacing: 0.85 },
  { id: 'airy-grid', jitter: 0.1, rotationRange: 6, spacing: 1.3 },
  { id: 'waves', jitter: 0.28, rotationRange: 14, spacing: 1.05, mode: 'wave' },
  { id: 'random-walk', jitter: 0.4, rotationRange: 20, spacing: 1.1 },
  { id: 'honeycomb', jitter: 0.12, rotationRange: 10, spacing: 1.0 },
  { id: 'confetti', jitter: 0.45, rotationRange: 30, spacing: 1.0 },
];

// Pick a style for an event. Same event id -> same style, always.
export function pickLayoutStyle(eventId) {
  const idx = Math.abs(hashStringToInt(eventId)) % LAYOUT_STYLES.length;
  return LAYOUT_STYLES[idx];
}

// Computes { x, y, rotation } for every approved submission, given the
// wall's pixel dimensions. Recompute this any time the approved count
// changes -- it takes the *current* list, so removals/replacements
// naturally reflow the wall.
export function computeWallPositions(submissionIds, eventId, wallWidth, wallHeight, styleIdOverride) {
  const style = styleIdOverride
    ? LAYOUT_STYLES.find((s) => s.id === styleIdOverride) || pickLayoutStyle(eventId)
    : pickLayoutStyle(eventId);
  const count = submissionIds.length;
  if (count === 0) return {};

  const cols = Math.ceil(Math.sqrt(count * (wallWidth / wallHeight)));
  const rows = Math.ceil(count / cols);
  const cellW = (wallWidth / cols) * style.spacing;
  const cellH = (wallHeight / rows) * style.spacing;

  const positions = {};
  submissionIds.forEach((id, i) => {
    const rand = mulberry32(hashStringToInt(eventId + id));
    const col = i % cols;
    const row = Math.floor(i / cols);

    let baseX = col * cellW + cellW / 2;
    let baseY = row * cellH + cellH / 2;

    if (style.mode === 'spiral') {
      const angle = i * 0.6;
      const radius = (i / count) * Math.min(wallWidth, wallHeight) * 0.45;
      baseX = wallWidth / 2 + radius * Math.cos(angle);
      baseY = wallHeight / 2 + radius * Math.sin(angle);
    } else if (style.mode === 'wave') {
      baseY += Math.sin(col * 0.8) * cellH * 0.3;
    }

    const jitterX = (rand() - 0.5) * cellW * style.jitter;
    const jitterY = (rand() - 0.5) * cellH * style.jitter;
    const rotation = (rand() - 0.5) * 2 * style.rotationRange;

    positions[id] = {
      x: Math.min(Math.max(baseX + jitterX, 0), wallWidth),
      y: Math.min(Math.max(baseY + jitterY, 0), wallHeight),
      rotation,
    };
  });

  return positions;
}