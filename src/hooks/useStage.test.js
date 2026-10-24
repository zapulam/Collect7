import { describe, expect, it } from 'vitest';
import { FLIP_MS, pickHold, STAGGER_MS } from './useStage.js';

const draw = (id, pid, via = 'hit') => ({ id, type: 'draw', pid, card: '5', via });

describe('pickHold', () => {
  it('ignores the deal and events that need no pause', () => {
    expect(pickHold([draw(1, 'amy', 'deal'), { id: 2, type: 'round', n: 1 }])).toBeNull();
    expect(pickHold([])).toBeNull();
  });

  it('holds on a player while their hit card turns over', () => {
    const hold = pickHold([draw(3, 'amy')]);
    expect(hold).toMatchObject({ id: 3, pid: 'amy', kind: 'draw', revealMs: FLIP_MS });
    expect(hold.ms).toBeGreaterThan(hold.revealMs);
  });

  it('prefers the outcome of the turn: a bust beats the draw that caused it', () => {
    const hold = pickHold([draw(4, 'ben'), { id: 5, type: 'bust', pid: 'ben', card: '5' }]);
    expect(hold).toMatchObject({ id: 5, pid: 'ben', kind: 'bust', revealMs: FLIP_MS });
  });

  it('waits for every card of a Flip Three, in turn', () => {
    const hold = pickHold([
      { id: 6, type: 'flip3', pid: 'amy', target: 'cat', how: 'chose' },
      draw(7, 'cat', 'flip3'),
      draw(8, 'cat', 'flip3'),
      draw(9, 'cat', 'flip3'),
    ]);
    expect(hold).toMatchObject({ pid: 'cat', kind: 'flip3', revealMs: 2 * STAGGER_MS + FLIP_MS });
  });

  it('shows a freeze on the player who was frozen, and a stay on the one who stayed', () => {
    expect(pickHold([{ id: 1, type: 'freeze', pid: 'amy', target: 'ben', how: 'chose' }])).toMatchObject({ pid: 'ben', kind: 'freeze', revealMs: 0 });
    expect(pickHold([{ id: 2, type: 'stay', pid: 'amy', how: 'chose' }])).toMatchObject({ pid: 'amy', kind: 'stay' });
  });

  it('gives Collect 7 the longest stay', () => {
    const collect = pickHold([draw(1, 'amy'), { id: 2, type: 'collect', pid: 'amy' }]);
    const bust = pickHold([draw(3, 'amy'), { id: 4, type: 'bust', pid: 'amy', card: '5' }]);
    expect(collect.ms).toBeGreaterThan(bust.ms);
  });
});
