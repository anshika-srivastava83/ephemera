// Deterministic pseudo-random number generator
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStringToInt(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

// 12 wall styles. Legacy ids (scatter-loose, spiral-out, cluster-corners, dense-collage)
// are kept because events may have stored them, but each now has its own composition.
export const LAYOUT_STYLES = [
  {
    id: 'scatter',
    label: 'Scatter',
    description: 'Prints spread evenly across the wall with natural paper tilts.',
    jitter: 0.35,
    rotationRange: 14,
    spacing: 1.15,
    stagger: 0.28,
    mode: 'grid',
  },
  {
    id: 'scatter-loose',
    label: 'Loose Scatter',
    description: 'A looser, airier spread with wider tilts and more breathing room.',
    jitter: 0.7,
    rotationRange: 18,
    spacing: 1.2,
    stagger: 0.1,
    mode: 'grid',
  },
  {
    id: 'scatter-tight',
    label: 'Tidy Rows',
    description: 'Neat, near-level rows, like a gallery hang.',
    jitter: 0.12,
    rotationRange: 4,
    spacing: 0.95,
    stagger: 0,
    mode: 'grid',
  },
  {
    id: 'constellation',
    label: 'Constellation',
    description: 'Three loose clusters of prints, like groups gathered around a table.',
    jitter: 0.42,
    rotationRange: 18,
    spacing: 1.1,
    mode: 'constellation',
  },
  {
    id: 'cluster-corners',
    label: 'Four Corners',
    description: 'Prints gather in the four corners, leaving the centre open.',
    jitter: 0.3,
    rotationRange: 16,
    spacing: 1.1,
    mode: 'corners',
  },
  {
    id: 'spiral',
    label: 'Spiral',
    description: 'A single spiral flowing outward from the centre.',
    jitter: 0.22,
    rotationRange: 12,
    spacing: 1.05,
    mode: 'spiral',
  },
  {
    id: 'spiral-out',
    label: 'Twin Spiral',
    description: 'Two interlocking spiral arms radiating from the centre.',
    jitter: 0.18,
    rotationRange: 10,
    spacing: 1.05,
    mode: 'spiral2',
  },
  {
    id: 'tabletop',
    label: 'Tabletop',
    description: 'Prints scattered across a table, overlapping at the edges.',
    jitter: 0.28,
    rotationRange: 22,
    spacing: 0.88,
    mode: 'tabletop',
  },
  {
    id: 'dense-collage',
    label: 'Heap',
    description: 'A rich, heavy pile of prints, densest at the centre.',
    jitter: 0.28,
    rotationRange: 26,
    spacing: 0.85,
    mode: 'collage',
  },
  {
    id: 'waves',
    label: 'Waves',
    description: 'Rows that rise and fall in a gentle wave.',
    jitter: 0.2,
    rotationRange: 10,
    spacing: 1.05,
    stagger: 0.15,
    mode: 'wave',
  },
  {
    id: 'honeycomb',
    label: 'Honeycomb',
    description: 'Interlocking rows offset by half a print, like a honeycomb.',
    jitter: 0.06,
    rotationRange: 6,
    spacing: 1.0,
    stagger: 0.5,
    mode: 'hex',
  },
  {
    id: 'confetti',
    label: 'Confetti',
    description: 'Prints tossed freely with bold tilts, as if thrown in the air.',
    jitter: 0.45,
    rotationRange: 28,
    spacing: 1.0,
    mode: 'confetti',
  },
];

// Ids that existing events may reference but that are no longer separate options
const PRIMARY_IDS = ['scatter', 'constellation', 'spiral', 'tabletop'];

export function resolveStyle(styleId) {
  const found = LAYOUT_STYLES.find((s) => s.id === styleId);
  if (!found) return LAYOUT_STYLES[0];
  if (found.aliasFor) {
    return LAYOUT_STYLES.find((s) => s.id === found.aliasFor) || found;
  }
  return found;
}

export function pickLayoutStyle(eventId) {
  const primary = LAYOUT_STYLES.filter((s) => PRIMARY_IDS.includes(s.id));
  const idx = Math.abs(hashStringToInt(eventId || 'ephemera')) % primary.length;
  return primary[idx];
}

// Slot capacity grows in tiers so the grid only reflows at tier boundaries,
// not every time a single photograph is approved.
const CAPACITY_TIERS = [6, 12, 20, 30, 42, 56, 72, 90, 110, 132, 156, 182, 210];

export function capacityFor(count) {
  const tier = CAPACITY_TIERS.find((c) => c >= count);
  if (tier) return tier;
  const last = CAPACITY_TIERS[CAPACITY_TIERS.length - 1];
  return last + Math.ceil((count - last) / 30) * 30;
}

// Polaroid print proportions (matches lib/compositePolaroid.js: 880 x 1044).
export const CARD_ASPECT = 1044 / 880;

// Grid (cols x rows, >= capacity cells) that lets the largest Polaroid fit its cell.
function bestGrid(capacity, wallWidth, wallHeight) {
  let best = { cols: 1, rows: capacity, fit: 0 };
  for (let c = 1; c <= capacity; c++) {
    const r = Math.ceil(capacity / c);
    const fit = Math.min(wallWidth / c, wallHeight / (r * CARD_ASPECT));
    // Prefer larger cards; break ties toward fewer empty cells
    if (fit > best.fit + 0.5 || (Math.abs(fit - best.fit) <= 0.5 && c * r < best.cols * best.rows)) {
      best = { cols: c, rows: r, fit };
    }
  }
  return best;
}

/**
 * Card width (px) for the canvas and slot capacity: large when the wall is sparse
 * (a handful of prints still fills the room), smaller as it fills. Cards are sized to
 * their grid cell with a little give, so neighbours overlap only slightly.
 */
export function computeCardWidth(count, wallWidth, wallHeight) {
  const capacity = capacityFor(Math.max(count, 1));
  const { fit } = bestGrid(capacity, wallWidth, wallHeight);
  const maxW = Math.min(wallWidth * 0.34, 360);
  return Math.round(Math.max(84, Math.min(fit * 0.9, maxW)));
}

// Deterministic Fisher-Yates so early photographs spread across the whole canvas
// instead of filling the top-left cells first.
function shuffledSlots(n, seed) {
  const rand = mulberry32(seed);
  const slots = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots;
}

/**
 * Computes deterministic { x, y, rotation, scale, zIndex } for every approved submission.
 * x/y are card centres. When `cardWidth` is provided, centres are inset so the full
 * (rotated, scaled) card always stays inside the canvas. Photographs keep their slot as
 * new ones arrive; the grid only reflows when capacity moves up a tier.
 */
export function computeWallPositions(
  submissionIds,
  eventId,
  wallWidth,
  wallHeight,
  styleIdOverride,
  cardWidth = null
) {
  const style = styleIdOverride ? resolveStyle(styleIdOverride) : pickLayoutStyle(eventId);
  const count = submissionIds.length;
  if (count === 0) return {};

  const capacity = capacityFor(count);

  // Inset so a rotated, slightly scaled card never leaves the canvas
  const halfW = cardWidth ? cardWidth * 0.5 * 1.18 : 0;
  const halfH = cardWidth ? cardWidth * CARD_ASPECT * 0.5 * 1.18 : 0;
  const padX = cardWidth ? halfW + 8 : Math.min(100, wallWidth * 0.08);
  const padY = cardWidth ? halfH + 8 : Math.min(90, wallHeight * 0.08);
  const usableW = Math.max(1, wallWidth - padX * 2);
  const usableH = Math.max(1, wallHeight - padY * 2);

  const { cols, rows } = bestGrid(capacity, wallWidth, wallHeight);
  const cellW = wallWidth / cols;
  const cellH = wallHeight / rows;
  const spacing = style.spacing || 1;

  const slotOrder = shuffledSlots(cols * rows, hashStringToInt(`${eventId || ''}:${capacity}`));
  const positions = {};

  submissionIds.forEach((id, i) => {
    const rand = mulberry32(hashStringToInt((eventId || '') + id));
    const slot = slotOrder[i % slotOrder.length];
    const col = slot % cols;
    const row = Math.floor(slot / cols);

    // Centre of this slot's cell across the whole canvas (clamped inward below)
    let baseX = ((col + 0.5) / cols) * wallWidth;
    let baseY = ((row + 0.5) / rows) * wallHeight;
    // Brickwork stagger so rows never read as a rigid grid
    if (cols > 1 && row % 2 === 1) baseX += (style.stagger ?? 0) * cellW;

    if (style.mode === 'spiral') {
      const angle = i * 0.65;
      const radius = (Math.sqrt(i + 1) / Math.sqrt(capacity + 1)) * 0.5;
      baseX = wallWidth / 2 + radius * Math.cos(angle) * usableW;
      baseY = wallHeight / 2 + radius * Math.sin(angle) * usableH;
    } else if (style.mode === 'constellation') {
      const centers = [
        { x: wallWidth * 0.3, y: wallHeight * 0.4 },
        { x: wallWidth * 0.7, y: wallHeight * 0.38 },
        { x: wallWidth * 0.5, y: wallHeight * 0.66 },
      ];
      const c = centers[i % 3];
      const r = (rand() * 0.55 + 0.1) * 0.5;
      const theta = rand() * Math.PI * 2;
      baseX = c.x + r * Math.cos(theta) * usableW * 0.6;
      baseY = c.y + r * Math.sin(theta) * usableH * 0.6;
    } else if (style.mode === 'spiral2') {
      const arm = i % 2;
      const k = Math.floor(i / 2);
      const angle = k * 0.7 + arm * Math.PI;
      const radius = (Math.sqrt(k + 1) / Math.sqrt(capacity / 2 + 1)) * 0.5;
      baseX = wallWidth / 2 + radius * Math.cos(angle) * usableW;
      baseY = wallHeight / 2 + radius * Math.sin(angle) * usableH;
    } else if (style.mode === 'corners') {
      const corners = [
        { x: 0.2, y: 0.25 },
        { x: 0.8, y: 0.25 },
        { x: 0.2, y: 0.75 },
        { x: 0.8, y: 0.75 },
      ];
      const c = corners[i % 4];
      baseX = wallWidth * c.x + (rand() - 0.5) * usableW * 0.3;
      baseY = wallHeight * c.y + (rand() - 0.5) * usableH * 0.34;
    } else if (style.mode === 'collage') {
      // Centre-weighted pile: average of two uniforms gives a soft bell
      baseX = wallWidth / 2 + ((rand() + rand() - 1) * usableW) / 2;
      baseY = wallHeight / 2 + ((rand() + rand() - 1) * usableH) / 2;
    } else if (style.mode === 'confetti') {
      baseX = padX + rand() * usableW;
      baseY = padY + rand() * usableH;
    } else if (style.mode === 'wave') {
      baseY += Math.sin(col * 0.85) * cellH * 0.35;
    } else if (style.mode === 'tabletop') {
      baseX += (rand() - 0.5) * usableW * 0.2;
      baseY += (rand() - 0.5) * usableH * 0.2;
    }

    const jitterX = (rand() - 0.5) * cellW * (style.jitter || 0.2) * spacing;
    const jitterY = (rand() - 0.5) * cellH * (style.jitter || 0.2) * spacing;
    const rotation = (rand() - 0.5) * 2 * (style.rotationRange || 14);

    // Subtle scale variance for physical depth
    const scale = 0.94 + rand() * 0.12;

    positions[id] = {
      x: Math.min(Math.max(baseX + jitterX, padX), wallWidth - padX),
      y: Math.min(Math.max(baseY + jitterY, padY), wallHeight - padY),
      rotation: Number(rotation.toFixed(2)),
      scale: Number(scale.toFixed(3)),
      zIndex: i + 1,
    };
  });

  return positions;
}
