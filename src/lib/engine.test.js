import { describe, expect, it } from 'vitest';
import { buildDeck, DECK_SIZE, seededRng } from './cards.js';
import { DEFAULT_PACE, gameReducer, HIT_BEAT_MS, MAX_PLAYERS, seatedIds } from './engine.js';
import { handScore, bustChance, findWinner } from './scoring.js';
import { fromWire, publicView, sanitizeRequest, toWire } from './wire.js';

const AMY = 'amy000';
const BEN = 'ben000';
const CAT = 'cat000';
const IDS = [AMY, BEN, CAT];

function join(s, playerId, name, clientId = `c${playerId}`) {
  return gameReducer(s, { type: 'join', source: 'phone', gameId: s.gameId, playerId, clientId, name });
}

// Three players (Amy, Ben, Cat); Cat deals round 1, so Amy is dealt first and acts first.
// `deck` is the draw order.
function setup(deck, { ids = IDS, target = 200, turnSeconds = 0 } = {}) {
  let s = gameReducer(null, { type: 'create', gameId: 'game01', target, turnSeconds });
  ids.forEach((id) => (s = join(s, id, id.slice(0, 3))));
  return gameReducer(s, { type: 'start', deck, now: 1000 });
}

const act = (s, type, extra = {}) => gameReducer(s, { type, now: 1000, ...extra });
const hit = (s, playerId) => act(s, 'hit', { playerId });
const stay = (s, playerId) => act(s, 'stay', { playerId });
const choose = (s, playerId, target) => act(s, 'choose', { playerId, target });
const hand = (s, id) => s.round.hands[id];
const pending = (s) => s.round.pending;

// Every card is somewhere: draw pile, discard, in front of a player, or waiting on the stack.
function cardsAccountedFor(s) {
  let count = s.draw.length + s.discard.length;
  if (s.round && !s.round.over) {
    for (const h of Object.values(s.round.hands)) count += h.cards.length + (h.second ? 1 : 0);
    for (const task of s.round.stack) count += (task.card ? 1 : 0) + (task.deferred?.length ?? 0);
  }
  return count;
}

describe('deck and scoring', () => {
  it('has the official 94 cards', () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(DECK_SIZE);
    expect(deck.filter((c) => c === '12')).toHaveLength(12);
    expect(deck.filter((c) => c === '1')).toHaveLength(1);
    expect(deck.filter((c) => c === '0')).toHaveLength(1);
    expect(deck.filter((c) => c === 'freeze')).toHaveLength(3);
    expect(deck.filter((c) => c === 'x2')).toHaveLength(1);
  });

  it('doubles only the numbers, then adds modifiers and the seven-card bonus', () => {
    expect(handScore(['12', '5', 'x2', '+4'])).toBe(38);
    expect(handScore(['0', '1', '2', '3', '4', '5', '6'])).toBe(21 + 15);
    expect(handScore(['0', '1', '2', '3', '4', '5', '6', 'x2', '+10'])).toBe(42 + 10 + 15);
    expect(handScore(['freeze', '7'])).toBe(7);
  });

  it('works out bust chance from the cards left in the deck', () => {
    const left = Array(13).fill(0);
    left[5] = 3;
    left[9] = 1;
    expect(bustChance(['5', '9', '+2'], left, 20)).toBeCloseTo(4 / 20);
    expect(bustChance([], left, 20)).toBe(0);
  });

  it('needs a single leader at or above the target', () => {
    expect(findWinner({ a: 210, b: 190 }, ['a', 'b'], 200)).toBe('a');
    expect(findWinner({ a: 210, b: 210 }, ['a', 'b'], 200)).toBeNull();
    expect(findWinner({ a: 150, b: 120 }, ['a', 'b'], 200)).toBeNull();
  });
});

describe('lobby', () => {
  it('rejects duplicate names, joining after the start and a full table', () => {
    let s = gameReducer(null, { type: 'create', gameId: 'game01' });
    s = join(s, AMY, 'Amy');
    s = join(s, BEN, ' amy ');
    expect(s.rejections[BEN].reason).toBe('nameTaken');
    s = join(s, BEN, 'Ben');
    expect(s.rejections[BEN]).toBeUndefined();
    expect(seatedIds(s)).toEqual([AMY, BEN]);

    for (let i = 2; i < MAX_PLAYERS; i++) s = join(s, `pl${i}xxxx`, `P${i}`);
    s = join(s, 'late00', 'Late');
    expect(s.rejections.late00.reason).toBe('full');

    let t = gameReducer(null, { type: 'create', gameId: 'game01' });
    t = join(join(t, AMY, 'Amy'), BEN, 'Ben');
    t = gameReducer(t, { type: 'start', deck: buildDeck() });
    t = join(t, CAT, 'Cat');
    expect(t.rejections[CAT].reason).toBe('started');
    expect(t.players[CAT]).toBeUndefined();
  });

  it('needs two players to start', () => {
    let s = gameReducer(null, { type: 'create', gameId: 'game01' });
    s = join(s, AMY, 'Amy');
    expect(gameReducer(s, { type: 'start' })).toBe(s);
  });

  it('only lets a phone act for its own player', () => {
    const s = setup(['1', '2', '3', '4']);
    const base = { source: 'phone', gameId: 'game01', playerId: AMY, turnSeq: s.round.turnSeq };
    expect(gameReducer(s, { ...base, type: 'hit', clientId: 'cben000' })).toBe(s);
    expect(gameReducer(s, { ...base, type: 'hit', clientId: 'camy000' })).not.toBe(s);
    expect(gameReducer(s, { ...base, type: 'hit', clientId: 'camy000', turnSeq: 1 })).toBe(s);
  });
});

describe('a round', () => {
  it('deals one card each starting left of the dealer, then Amy acts first', () => {
    const s = setup(['3', '5', '7', '9']);
    expect(s.round.dealer).toBe(CAT);
    expect([hand(s, AMY).cards, hand(s, BEN).cards, hand(s, CAT).cards]).toEqual([['3'], ['5'], ['7']]);
    expect(pending(s)).toEqual({ kind: 'turn', pid: AMY });
  });

  it('busts on a duplicate number and passes the turn', () => {
    let s = setup(['3', '5', '7', '3', '1']);
    s = hit(s, AMY);
    expect(hand(s, AMY).status).toBe('bust');
    expect(pending(s).pid).toBe(BEN);
  });

  it('rejects out-of-turn and stale requests without changing anything', () => {
    const s = setup(['3', '5', '7', '9']);
    expect(hit(s, BEN)).toBe(s);
    expect(choose(s, AMY, BEN)).toBe(s);
  });

  it('banks points when everyone has stayed or busted', () => {
    let s = setup(['3', '5', '7', '+4', '5', 'x2']);
    s = hit(s, AMY); // 3 +4
    s = hit(s, BEN); // 5,5 bust
    s = hit(s, CAT); // 7 x2
    s = stay(s, AMY);
    expect(pending(s).pid).toBe(CAT); // Ben is out
    s = stay(s, CAT);
    expect(s.phase).toBe('roundEnd');
    expect(s.round.points).toEqual({ [AMY]: 7, [BEN]: 0, [CAT]: 14 });
    expect(s.totals).toEqual({ [AMY]: 7, [BEN]: 0, [CAT]: 14 });
    expect(s.history).toEqual([{ round: 1, points: s.round.points }]);
  });

  it('ends the round at once on seven different numbers, and the others bank', () => {
    let s = setup(['0', '12', '11', '1', '2', '3', '4', '5'], { ids: [AMY, BEN] });
    // Ben deals: Amy gets 0, Ben 12.
    s = hit(s, AMY); // 11
    s = stay(s, BEN);
    for (let i = 0; i < 5; i++) s = hit(s, AMY); // 1..5 -> 0,11,1,2,3,4,5
    expect(hand(s, AMY).status).toBe('collected');
    expect(s.phase).toBe('roundEnd');
    expect(s.round.points[AMY]).toBe(0 + 11 + 1 + 2 + 3 + 4 + 5 + 15);
    expect(s.round.points[BEN]).toBe(12);
  });

  it('lets Second Chance cancel a duplicate', () => {
    let s = setup(['3', '5', '7', 'second', '9', '1', '3']);
    s = hit(s, AMY); // second chance
    s = hit(s, BEN); // 9
    s = hit(s, CAT); // 1
    s = hit(s, AMY); // 3 again: saved
    expect(hand(s, AMY)).toEqual({ cards: ['3'], status: 'active', second: false });
    expect(s.discard).toEqual(['3', 'second']);
  });

  it('freezes the chosen player, who banks their points', () => {
    let s = setup(['3', '5', '7', 'freeze']);
    s = hit(s, AMY);
    expect(pending(s)).toEqual({ kind: 'freeze', pid: AMY, options: IDS });
    s = choose(s, AMY, CAT);
    expect(hand(s, CAT).status).toBe('frozen');
    expect(hand(s, CAT).cards).toEqual(['7', 'freeze']);
    expect(pending(s)).toEqual({ kind: 'turn', pid: BEN });
  });

  it('freezes the drawer without asking when they are the last one in', () => {
    let s = setup(['3', '5', '7', 'freeze']);
    s = stay(s, AMY);
    s = stay(s, BEN);
    s = hit(s, CAT);
    expect(hand(s, CAT).status).toBe('frozen');
    expect(s.phase).toBe('roundEnd');
  });

  it('makes the Flip Three target take three cards', () => {
    let s = setup(['3', '5', '7', 'flip3', '1', '+2', '9', '4']);
    s = hit(s, AMY);
    s = choose(s, AMY, BEN);
    expect(hand(s, BEN).cards).toEqual(['5', 'flip3', '1', '+2', '9']);
    expect(pending(s)).toEqual({ kind: 'turn', pid: BEN });
  });

  it('stops a Flip Three on a bust and discards anything set aside', () => {
    let s = setup(['3', '5', '7', 'flip3', 'freeze', '5', '9']);
    s = hit(s, AMY);
    s = choose(s, AMY, BEN);
    expect(hand(s, BEN).status).toBe('bust');
    expect(s.discard).toContain('freeze');
    expect(s.draw).toEqual(['9']);
  });

  it('plays a set-aside Freeze after the Flip Three', () => {
    let s = setup(['3', '5', '7', 'flip3', 'freeze', '1', '2', '9']);
    s = hit(s, AMY);
    s = choose(s, AMY, BEN);
    expect(hand(s, BEN).cards).toEqual(['5', 'flip3', '1', '2']);
    expect(pending(s)).toEqual({ kind: 'freeze', pid: BEN, options: IDS });
    s = choose(s, BEN, AMY);
    expect(hand(s, AMY).status).toBe('frozen');
    expect(pending(s)).toEqual({ kind: 'turn', pid: BEN });
  });

  it('resolves a Flip Three revealed inside a Flip Three afterwards', () => {
    let s = setup(['3', '5', '7', 'flip3', '1', 'flip3', '2', '4', '6', '8', '10']);
    s = hit(s, AMY);
    s = choose(s, AMY, BEN); // Ben: 1, (flip3 set aside), 2
    expect(pending(s)).toEqual({ kind: 'flip3', pid: BEN, options: IDS });
    s = choose(s, BEN, CAT); // Cat: 4, 6, 8
    expect(hand(s, BEN).cards).toEqual(['5', 'flip3', '1', '2']);
    expect(hand(s, CAT).cards).toEqual(['7', 'flip3', '4', '6', '8']);
  });

  it('uses a Second Chance found during a Flip Three straight away', () => {
    let s = setup(['3', '5', '7', 'flip3', 'second', '5', '9', '4']);
    s = hit(s, AMY);
    s = choose(s, AMY, BEN);
    expect(hand(s, BEN)).toEqual({ cards: ['5', 'flip3', '9'], status: 'active', second: false });
    expect(s.draw).toEqual(['4']);
  });

  it('passes a spare Second Chance on, or discards it when nobody can take it', () => {
    let s = setup(['3', '5', '7', 'second', '1', '2', 'second', 'second']);
    s = hit(s, AMY); // Amy holds one
    s = hit(s, BEN); // 1
    s = hit(s, CAT); // 2
    s = hit(s, AMY); // a second one: Ben or Cat
    expect(pending(s)).toEqual({ kind: 'second', pid: AMY, options: [BEN, CAT] });
    s = choose(s, AMY, CAT);
    expect(hand(s, CAT).second).toBe(true);
    s = hit(s, BEN); // the third: Ben has none yet, so he keeps it
    expect(hand(s, BEN).second).toBe(true);
    s = stay(s, CAT);
    s = stay(s, AMY);
    expect(cardsAccountedFor(s)).toBe(8);
  });

  it('pauses the deal for an action card, then carries on', () => {
    let s = setup(['freeze', '5', '7', '9']);
    expect(pending(s)).toEqual({ kind: 'freeze', pid: AMY, options: IDS });
    expect(hand(s, BEN).cards).toEqual([]);
    s = choose(s, AMY, BEN);
    expect(hand(s, BEN).status).toBe('frozen');
    // Ben is skipped for the rest of the deal.
    expect(hand(s, CAT).cards).toEqual(['5']);
    expect(pending(s)).toEqual({ kind: 'turn', pid: AMY });
  });

  it('shuffles the discard pile back in when the draw pile runs out', () => {
    let s = setup(['3', '5', '7', '+2', '+4', '9', '9', '9']);
    s = hit(s, AMY); // +2
    s = hit(s, BEN); // +4
    s = hit(s, CAT); // 9
    s = hit(s, AMY); // 9
    s = hit(s, BEN); // 9
    s = hit(s, CAT); // nothing left anywhere: the round ends
    expect(s.phase).toBe('roundEnd');
    expect(s.round.points).toEqual({ [AMY]: 14, [BEN]: 18, [CAT]: 16 });
    s = act(s, 'nextRound', { seed: 7 });
    expect(s.log.some((e) => e.type === 'reshuffle')).toBe(true);
    expect(cardsAccountedFor(s)).toBe(8);
  });

  it('moves the deal to the left each round', () => {
    let s = setup(buildDeck());
    expect(s.round.dealer).toBe(CAT);
    s = act(s, 'skip');
    while (s.phase === 'playing') s = stay(s, pending(s).pid);
    s = act(s, 'nextRound');
    expect(s.round.dealer).toBe(AMY);
  });
});

describe('pause between turns', () => {
  const phone = (s, type, playerId, now, extra = {}) =>
    gameReducer(s, { type, source: 'phone', gameId: s.gameId, playerId, clientId: `c${playerId}`, turnSeq: s.round.turnSeq, now, ...extra });

  it('locks the first turn for the pace, then lets the phone through', () => {
    const s = setup(['3', '5', '7', '9']);
    expect(s.settings.pace).toBe(DEFAULT_PACE);
    expect(s.round.unlockAt).toBe(1000 + DEFAULT_PACE * 1000);
    expect(phone(s, 'hit', AMY, 1000 + DEFAULT_PACE * 1000 - 1)).toBe(s);
    expect(phone(s, 'stay', AMY, 1000)).toBe(s);
    expect(hand(phone(s, 'hit', AMY, 1000 + DEFAULT_PACE * 1000), AMY).cards).toEqual(['3', '9']);
  });

  it('makes the next player wait the full pace, but someone asked again only a short beat', () => {
    let s = setup(['3', '5', '7', '9', '4', '6'], { ids: [AMY, BEN] });
    const open = s.round.unlockAt;
    s = phone(s, 'hit', AMY, open);
    expect(pending(s).pid).toBe(BEN);
    expect(s.round.unlockAt).toBe(open + DEFAULT_PACE * 1000);
    s = phone(s, 'stay', BEN, s.round.unlockAt);
    expect(pending(s).pid).toBe(AMY);
    expect(s.round.unlockAt).toBe(open + 2 * DEFAULT_PACE * 1000);
    // Amy is the only one left, so each Hit asks her again straight away.
    s = phone(s, 'hit', AMY, s.round.unlockAt);
    expect(pending(s).pid).toBe(AMY);
    expect(s.round.unlockAt).toBe(open + 2 * DEFAULT_PACE * 1000 + HIT_BEAT_MS);
  });

  it('applies to target choices, but never to the big screen itself', () => {
    let s = setup(['3', '5', '7', 'freeze'], { ids: [AMY, BEN, CAT] });
    const open = s.round.unlockAt;
    s = phone(s, 'hit', AMY, open);
    expect(pending(s).kind).toBe('freeze');
    const target = pending(s).options[0];
    expect(phone(s, 'choose', AMY, open, { target })).toBe(s);
    expect(phone(s, 'choose', AMY, s.round.unlockAt, { target })).not.toBe(s);
    // Master controls and the timer ignore the pause.
    expect(hand(act(s, 'skip', { turnSeq: s.round.turnSeq }), AMY).status).toBe('frozen');
  });

  it('starts the turn timer after the pause, and every round starts with a full pause', () => {
    let s = setup(['3', '5', '7', '9'], { ids: [AMY, BEN], turnSeconds: 30 });
    expect(s.round.deadline).toBe(s.round.unlockAt + 30000);
    s = stay(s, AMY);
    s = stay(s, BEN);
    s = act(s, 'nextRound', { now: 50000 });
    expect(s.round.unlockAt).toBe(50000 + DEFAULT_PACE * 1000);
  });

  it('changes the pace from a fixed set, and it travels over the wire', () => {
    let s = gameReducer(null, { type: 'create', gameId: 'game01' });
    expect(gameReducer(s, { type: 'settings', pace: 7 })).toBe(s);
    s = gameReducer(s, { type: 'settings', pace: 5 });
    expect(s.settings.pace).toBe(5);
    expect(gameReducer(s, { type: 'settings', pace: 5 })).toBe(s);
    expect(fromWire(toWire(publicView(s))).settings.pace).toBe(5);
    const started = setup(['3', '5', '7', '9']);
    const round = fromWire(toWire(publicView(started))).round;
    expect(round.unlockAt).toBe(started.round.unlockAt);
  });

  it('treats a game saved before pacing existed as the default pace', () => {
    const old = setup(['3', '5', '7', '9']);
    delete old.settings.pace;
    expect(publicView(old).settings.pace).toBe(DEFAULT_PACE);
  });
});

describe('timer and master controls', () => {
  it('sets a deadline and stays on timeout', () => {
    let s = setup(['3', '5', '7', '9'], { turnSeconds: 15 });
    expect(s.round.deadline).toBe(1000 + DEFAULT_PACE * 1000 + 15000);
    expect(act(s, 'timeout', { turnSeq: s.round.turnSeq - 1 })).toBe(s);
    s = act(s, 'timeout', { turnSeq: s.round.turnSeq });
    expect(hand(s, AMY).status).toBe('stayed');
    expect(pending(s).pid).toBe(BEN);
  });

  it('times out a Freeze onto the drawer and a Flip Three onto someone else', () => {
    let s = setup(['3', '5', '7', 'freeze'], { turnSeconds: 15 });
    s = hit(s, AMY);
    s = act(s, 'timeout', { turnSeq: s.round.turnSeq });
    expect(hand(s, AMY).status).toBe('frozen');

    let t = setup(['3', '5', '7', 'flip3', '1', '2', '4'], { turnSeconds: 15 });
    t = hit(t, AMY);
    t = act(t, 'timeout', { turnSeq: t.round.turnSeq, seed: 3 });
    expect(hand(t, AMY).cards).toEqual(['3']);
  });

  it('removes a player mid-turn and carries on', () => {
    let s = setup(['3', '5', '7', '9']);
    s = act(s, 'remove', { playerId: AMY });
    expect(s.players[AMY].left).toBe(true);
    expect(pending(s).pid).toBe(BEN);
    expect(cardsAccountedFor(s)).toBe(4);
  });

  it('keeps playing rounds while the leaders are tied', () => {
    let s = setup(['10', '10', '1', '2'], { ids: [AMY, BEN], target: 10 });
    s = stay(s, AMY);
    s = stay(s, BEN);
    expect(s.totals).toEqual({ [AMY]: 10, [BEN]: 10 });
    expect(s.phase).toBe('roundEnd');
    expect(s.winner).toBeNull();
  });

  it('ends the game when one player reaches the target alone', () => {
    let s = setup(['12', '3', '1', '2'], { ids: [AMY, BEN], target: 10 });
    s = stay(s, AMY);
    s = stay(s, BEN);
    expect(s.phase).toBe('gameOver');
    expect(s.winner).toBe(AMY);
    s = act(s, 'playAgain', { gameId: 'game02' });
    expect(s.phase).toBe('lobby');
    expect(s.totals).toEqual({ [AMY]: 0, [BEN]: 0 });
  });
});

describe('random games', () => {
  it('always finish and never lose or invent a card', () => {
    for (let game = 0; game < 200; game++) {
      const rng = seededRng(game + 1);
      const ids = IDS.slice(0, 2 + (game % 2));
      let s = gameReducer(null, { type: 'create', gameId: 'game01', target: 120 });
      ids.forEach((id) => (s = join(s, id, id)));
      s = gameReducer(s, { type: 'start', seed: game });
      let steps = 0;
      while (s.phase !== 'gameOver') {
        expect(++steps).toBeLessThan(5000);
        if (s.phase === 'roundEnd') {
          s = act(s, 'nextRound', { seed: steps });
          continue;
        }
        expect(cardsAccountedFor(s)).toBe(DECK_SIZE);
        const p = pending(s);
        const seed = Math.floor(rng() * 1e9);
        if (p.kind === 'turn') {
          s = act(s, rng() < 0.65 ? 'hit' : 'stay', { playerId: p.pid, seed });
        } else {
          s = act(s, 'choose', { playerId: p.pid, target: p.options[Math.floor(rng() * p.options.length)], seed });
        }
      }
      expect(s.totals[s.winner]).toBeGreaterThanOrEqual(120);
    }
  });
});

describe('wire format', () => {
  it('keeps the deck order and client ids off the wire, and reads back cleanly', () => {
    const s = setup(['3', '5', '7', '9', '9']);
    const wire = toWire(publicView(s));
    expect(JSON.stringify(wire)).not.toContain('camy000');
    expect(wire.draw).toBeUndefined();
    const game = fromWire(wire);
    expect(game.deck).toEqual({ count: 2, left: [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0] });
    expect(game.round.hands[AMY].cards).toEqual(['3']);
    expect(game.round.pending).toEqual({ kind: 'turn', pid: AMY, options: [] });
  });

  it('copes with the database dropping empty arrays', () => {
    const game = fromWire({ phase: 'lobby', gameId: 'game01', players: { amy000: { name: 'Amy' } } });
    expect(game.order).toEqual([]);
    expect(game.history).toEqual([]);
    expect(game.deck.left).toHaveLength(13);
  });

  it('sanitizes phone requests', () => {
    const base = { clientId: 'client01', playerId: 'player01', gameId: 'g1' };
    expect(sanitizeRequest({ ...base, type: 'hit', turnSeq: 4 })).toEqual({ ...base, source: 'phone', type: 'hit', turnSeq: 4 });
    expect(sanitizeRequest({ ...base, type: 'hit' })).toBeNull();
    expect(sanitizeRequest({ ...base, type: 'start' })).toBeNull();
    expect(sanitizeRequest({ ...base, type: 'choose', turnSeq: 1, target: '../x' })).toBeNull();
    expect(sanitizeRequest({ ...base, clientId: 'x', type: 'stay', turnSeq: 1 })).toBeNull();
  });
});
