import { describe, expect, it } from 'vitest';
import { stackMargin } from './stack.js';

describe('stackMargin', () => {
  it('needs no margin for a hand of zero or one', () => {
    expect(stackMargin(0)).toBe(0);
    expect(stackMargin(1)).toBe(0);
  });

  it('keeps a small gap while the cards fit side by side', () => {
    expect(stackMargin(2)).toBe(3);
    expect(stackMargin(4)).toBe(3);
  });

  it('overlaps more as the hand grows, and never hides a card completely', () => {
    const margins = [5, 6, 8, 10, 12].map((n) => stackMargin(n));
    expect(margins).toEqual([...margins].sort((a, b) => b - a));
    expect(margins[0]).toBeLessThanOrEqual(0);
    expect(margins.at(-1)).toBeLessThan(0);
    for (const margin of margins) expect(28 + margin).toBeGreaterThanOrEqual(11);
  });

  it('fits a typical hand inside the room it is given', () => {
    const room = 140;
    for (let n = 2; n <= 7; n++) expect(28 + (n - 1) * (28 + stackMargin(n, { room }))).toBeLessThanOrEqual(room);
  });
});
