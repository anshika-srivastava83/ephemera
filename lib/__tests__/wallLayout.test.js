import { describe, it, expect } from 'vitest';
import {
  capacityFor,
  computeCardWidth,
  CARD_ASPECT,
  computeWallPositions,
  LAYOUT_STYLES,
  resolveStyle,
  hashStringToInt,
} from '../wallLayout';

describe('Spatial Wall Layout Engine', () => {
  const sampleIds = ['sub-1', 'sub-2', 'sub-3', 'sub-4', 'sub-5', 'sub-6'];
  const eventId = 'e0000000-0000-4000-8000-000000000001';

  it('contains the 4 required primary layout modes', () => {
    const ids = LAYOUT_STYLES.map((s) => s.id);
    expect(ids).toContain('scatter');
    expect(ids).toContain('constellation');
    expect(ids).toContain('spiral');
    expect(ids).toContain('tabletop');
  });

  it('produces deterministic output for the same event and submissions', () => {
    const pos1 = computeWallPositions(sampleIds, eventId, 1400, 900, 'scatter');
    const pos2 = computeWallPositions(sampleIds, eventId, 1400, 900, 'scatter');

    expect(pos1).toEqual(pos2);
    expect(pos1['sub-1'].x).toBe(pos2['sub-1'].x);
    expect(pos1['sub-1'].rotation).toBe(pos2['sub-1'].rotation);
  });

  it('keeps all polaroid coordinates within canvas bounds', () => {
    const width = 1200;
    const height = 800;

    ['scatter', 'constellation', 'spiral', 'tabletop'].forEach((styleId) => {
      const positions = computeWallPositions(sampleIds, eventId, width, height, styleId);

      sampleIds.forEach((id) => {
        const item = positions[id];
        expect(item).toBeDefined();
        expect(item.x).toBeGreaterThanOrEqual(0);
        expect(item.x).toBeLessThanOrEqual(width);
        expect(item.y).toBeGreaterThanOrEqual(0);
        expect(item.y).toBeLessThanOrEqual(height);
        expect(item.scale).toBeGreaterThan(0.8);
      });
    });
  });

  it('handles empty submissions gracefully without errors', () => {
    const positions = computeWallPositions([], eventId, 1200, 800, 'spiral');
    expect(positions).toEqual({});
  });

  it('adapts to ultra-wide and mobile aspect ratios', () => {
    // Ultra-wide projector
    const wide = computeWallPositions(sampleIds, eventId, 2560, 1080, 'tabletop');
    expect(Object.keys(wide)).toHaveLength(6);

    // Vertical mobile screen
    const mobile = computeWallPositions(sampleIds, eventId, 390, 844, 'constellation');
    expect(Object.keys(mobile)).toHaveLength(6);
  });

  it('keeps whole cards inside the canvas for every style when a card width is given', () => {
    const width = 1280;
    const height = 720;
    const ids = Array.from({ length: 24 }, (_, i) => `p-${i}`);
    const cardWidth = computeCardWidth(ids.length, width, height);

    LAYOUT_STYLES.forEach((style) => {
      const positions = computeWallPositions(ids, eventId, width, height, style.id, cardWidth);
      ids.forEach((id) => {
        const p = positions[id];
        expect(p.x - cardWidth / 2).toBeGreaterThanOrEqual(0);
        expect(p.x + cardWidth / 2).toBeLessThanOrEqual(width);
        expect(p.y - (cardWidth * CARD_ASPECT) / 2).toBeGreaterThanOrEqual(0);
        expect(p.y + (cardWidth * CARD_ASPECT) / 2).toBeLessThanOrEqual(height);
      });
    });
  });

  it('does not move existing photographs when a new one arrives within a capacity tier', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const before = computeWallPositions(ids, eventId, 1440, 900, 'scatter', 220);
    const after = computeWallPositions([...ids, 'e'], eventId, 1440, 900, 'scatter', 220);
    expect(capacityFor(4)).toBe(capacityFor(5));
    ids.forEach((id) => {
      expect(after[id].x).toBe(before[id].x);
      expect(after[id].y).toBe(before[id].y);
    });
  });

  it('makes cards larger on a sparse wall than a full one', () => {
    expect(computeCardWidth(3, 1440, 900)).toBeGreaterThan(computeCardWidth(80, 1440, 900));
  });

  it('offers 12 styles that each produce a different composition', () => {
    expect(LAYOUT_STYLES).toHaveLength(12);
    const ids = Array.from({ length: 12 }, (_, i) => `s-${i}`);
    const signatures = LAYOUT_STYLES.map((style) => {
      const pos = computeWallPositions(ids, eventId, 1440, 800, style.id, 160);
      return ids.map((id) => `${Math.round(pos[id].x)},${Math.round(pos[id].y)}`).join('|');
    });
    expect(new Set(signatures).size).toBe(12);
  });
});
