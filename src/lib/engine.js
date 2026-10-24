// The game itself, as a pure reducer. The big screen owns the only copy of this state;
// phones see a public view of it (see wire.js) and send requests that become actions here.
//
// A round is driven by a small resolution stack. advance() keeps working on the top task
// until it needs a person (a Hit/Stay decision or a target choice) or the round is over:
//   deal    one face-up card to each active player, starting left of the dealer
//   flip3   a player must take the next `left` cards; Freeze/Flip Three are set aside
//   action  a set-aside Freeze/Flip Three, played by that player once their Flip Three ends
//   choose  a player picks who an action card goes to
// With the stack empty, the next active player in seat order is asked to Hit or Stay.
//
// No React or browser APIs here, so plain Node (vitest) can load it. Randomness comes from
// action.seed and the clock from action.now, so a step is repeatable.
import { buildDeck, shuffle, seededRng, isNumber, isModifier } from './cards.js';
import { hasCollected, roundPoints, findWinner } from './scoring.js';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;
export const NAME_MAX = 16;
export const TARGET_PRESETS = [100, 150, 200, 300];
export const TARGET_MIN = 25;
export const TARGET_MAX = 1000;
export const DEFAULT_TARGET = 200;
export const TIMER_OPTIONS = [0, 15, 30, 60];
export const CHOICE_KINDS = ['freeze', 'flip3', 'second'];
const LOG_SIZE = 30;

export function createGame({ gameId, target = DEFAULT_TARGET, turnSeconds = 0 }) {
  return {
    gameId,
    phase: 'lobby', // lobby | playing | roundEnd | gameOver
    settings: { target, turnSeconds },
    players: {}, // { [playerId]: { name, clientId, left? } } (clientId never leaves the host)
    order: [], // seat order; players who leave mid-game stay here, marked left
    totals: {},
    history: [], // [{ round, points: { [playerId]: n } }]
    round: null,
    draw: [], // draw pile, next card first (private)
    discard: [], // private
    seq: 0,
    events: 0,
    log: [], // recent events for the screens to animate: [{ id, type, ... }]
    rejections: {}, // { [playerId]: { reason, n } } for joins that didn't go through
    winner: null,
  };
}

export function cleanName(value) {
  return [...String(value ?? '')]
    .filter((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX)
    .trim();
}

// Players still in the game (not removed), in seat order.
export const seatedIds = (s) => s.order.filter((id) => s.players[id] && !s.players[id].left);

const isActive = (s, id) => s.round?.hands[id]?.status === 'active';
const activeIds = (s) => s.order.filter((id) => isActive(s, id));

// Seats after `id` going round the table, ending with `id` itself. Only ids passing `keep`.
function seatsAfter(s, id, keep) {
  const start = s.order.indexOf(id);
  const out = [];
  for (let i = 1; i <= s.order.length; i++) {
    const seat = s.order[(start + i) % s.order.length];
    if (keep(seat)) out.push(seat);
  }
  return out;
}

function emit(s, event) {
  s.events += 1;
  s.log = [...s.log, { id: s.events, ...event }].slice(-LOG_SIZE);
}

// ---- reducer ---------------------------------------------------------------------------

// Returns the same object when an action is rejected, so nothing re-renders or re-publishes.
export function gameReducer(state, action) {
  if (action.type === 'create') return createGame(action);
  if (action.type === 'restore') return action.state;
  if (!state) return state;
  if (action.source === 'phone' && !phoneMayAct(state, action)) return state;
  const s = structuredClone(state);
  const ctx = { now: action.now ?? 0, rng: seededRng(action.seed ?? 1) };
  if (!apply(s, action, ctx)) return state;
  s.seq += 1;
  return s;
}

function phoneMayAct(s, a) {
  if (a.gameId !== s.gameId) return false;
  if (a.type === 'join') return true;
  return s.players[a.playerId]?.clientId === a.clientId && !s.players[a.playerId].left;
}

function apply(s, a, ctx) {
  switch (a.type) {
    case 'join':
      return join(s, a);
    case 'kick':
      return kick(s, a.playerId);
    case 'settings':
      return changeSettings(s, a);
    case 'start':
      return startGame(s, ctx, a.deck);
    case 'hit':
    case 'stay':
      if (!awaiting(s, 'turn', a)) return false;
      return a.type === 'hit' ? hit(s, a.playerId, ctx) : stay(s, a.playerId, ctx, 'chose');
    case 'choose':
      if (!awaiting(s, CHOICE_KINDS, a) || !s.round.pending.options.includes(a.target)) return false;
      choose(s, a.target, ctx, 'chose');
      return true;
    case 'timeout':
      // Only the pending decision the timer was started for.
      if (!s.round?.pending || a.turnSeq !== s.round.turnSeq) return false;
      return resolveForThem(s, ctx, 'timeout');
    case 'skip':
      if (!s.round?.pending || (a.turnSeq != null && a.turnSeq !== s.round.turnSeq)) return false;
      return resolveForThem(s, ctx, 'skipped');
    case 'remove':
      return removePlayer(s, a.playerId, ctx);
    case 'nextRound':
      if (s.phase !== 'roundEnd' || !seatedIds(s).length) return false;
      startRound(s, ctx);
      return true;
    case 'playAgain':
      return playAgain(s, a.gameId);
    default:
      return false;
  }
}

// Is the game waiting on this player for this kind of decision (and is the request current)?
function awaiting(s, kinds, a) {
  const pending = s.round?.pending;
  if (s.phase !== 'playing' || !pending) return false;
  const kindOk = Array.isArray(kinds) ? kinds.includes(pending.kind) : pending.kind === kinds;
  return kindOk && pending.pid === a.playerId && (a.turnSeq == null || a.turnSeq === s.round.turnSeq);
}

// ---- lobby -----------------------------------------------------------------------------

// `n` changes with every attempt, so a phone can tell a fresh rejection from an old one.
function reject(s, playerId, reason) {
  s.rejections[playerId] = { reason, n: s.seq + 1 };
  return true;
}

function nameTaken(s, name, exceptId) {
  const key = name.toLowerCase();
  return seatedIds(s).some((id) => id !== exceptId && s.players[id].name.toLowerCase() === key);
}

function join(s, { playerId, clientId, name: rawName }) {
  const name = cleanName(rawName);
  const existing = s.players[playerId];
  if (existing) {
    if (existing.clientId !== clientId) return reject(s, playerId, 'badId');
    if (s.phase !== 'lobby' || !name || existing.name === name) return false;
    if (nameTaken(s, name, playerId)) return reject(s, playerId, 'nameTaken');
    existing.name = name; // renaming in the lobby
    delete s.rejections[playerId];
    return true;
  }
  if (!name) return reject(s, playerId, 'badName');
  if (s.phase !== 'lobby') return reject(s, playerId, 'started');
  if (Object.values(s.players).some((p) => p.clientId === clientId)) return reject(s, playerId, 'badId');
  if (seatedIds(s).length >= MAX_PLAYERS) return reject(s, playerId, 'full');
  if (nameTaken(s, name)) return reject(s, playerId, 'nameTaken');
  s.players[playerId] = { name, clientId };
  s.order.push(playerId);
  s.totals[playerId] = 0;
  delete s.rejections[playerId];
  emit(s, { type: 'join', pid: playerId });
  return true;
}

function kick(s, playerId) {
  if (s.phase !== 'lobby' || !s.players[playerId]) return false;
  delete s.players[playerId];
  delete s.totals[playerId];
  s.order = s.order.filter((id) => id !== playerId);
  return true;
}

function changeSettings(s, { target, turnSeconds }) {
  const next = { ...s.settings };
  if (target != null) {
    if (s.phase !== 'lobby' || !Number.isInteger(target) || target < TARGET_MIN || target > TARGET_MAX) return false;
    next.target = target;
  }
  if (turnSeconds != null) {
    if (!TIMER_OPTIONS.includes(turnSeconds)) return false;
    next.turnSeconds = turnSeconds;
  }
  if (next.target === s.settings.target && next.turnSeconds === s.settings.turnSeconds) return false;
  s.settings = next;
  return true;
}

function playAgain(s, gameId) {
  if (s.phase === 'lobby' || typeof gameId !== 'string' || !gameId) return false;
  const ids = seatedIds(s);
  s.gameId = gameId;
  s.phase = 'lobby';
  s.players = Object.fromEntries(ids.map((id) => [id, s.players[id]]));
  s.order = ids;
  s.totals = Object.fromEntries(ids.map((id) => [id, 0]));
  s.history = [];
  s.round = null;
  s.draw = [];
  s.discard = [];
  s.winner = null;
  s.rejections = {};
  s.log = [];
  return true;
}

// ---- rounds ----------------------------------------------------------------------------

function startGame(s, ctx, deck) {
  const ids = seatedIds(s);
  if (s.phase !== 'lobby' || ids.length < MIN_PLAYERS) return false;
  s.totals = Object.fromEntries(ids.map((id) => [id, 0]));
  s.history = [];
  s.winner = null;
  s.rejections = {};
  s.draw = Array.isArray(deck) ? [...deck] : shuffle(buildDeck(), ctx.rng);
  s.discard = [];
  s.round = null;
  startRound(s, ctx);
  return true;
}

function startRound(s, ctx) {
  const ids = seatedIds(s);
  const prev = s.round;
  // The deal moves one seat to the left each round; in round 1 the last seat deals.
  const dealer = prev ? seatsAfter(s, prev.dealer, (id) => ids.includes(id))[0] : ids[ids.length - 1];
  s.phase = 'playing';
  s.round = {
    n: (prev?.n ?? 0) + 1,
    dealer,
    hands: Object.fromEntries(ids.map((id) => [id, { cards: [], status: 'active', second: false }])),
    stack: [{ t: 'deal', seats: seatsAfter(s, dealer, (id) => ids.includes(id)) }],
    pending: null, // { kind: 'turn' | 'freeze' | 'flip3' | 'second', pid, options? }
    turnSeq: (prev?.turnSeq ?? 0) + 1, // bumps with every new decision, so stale taps are ignored
    deadline: null, // server time the pending decision times out, if the timer is on
    cursor: dealer, // the last player asked to Hit or Stay
    collected: null, // who got seven different numbers
    exhausted: false,
    points: null,
    over: false,
  };
  emit(s, { type: 'round', n: s.round.n, dealer });
  advance(s, ctx);
}

function advance(s, ctx) {
  const r = s.round;
  for (let guard = 0; guard < 2000; guard++) {
    if (r.collected || r.exhausted || !activeIds(s).length) {
      endRound(s);
      return;
    }
    if (r.pending) return;
    const task = r.stack[r.stack.length - 1];
    if (!task) {
      const next = seatsAfter(s, r.cursor, (id) => isActive(s, id))[0];
      r.cursor = next;
      ask(s, { kind: 'turn', pid: next }, ctx);
      return;
    }
    runTask(s, task, ctx);
  }
  throw new Error('Round did not settle');
}

function ask(s, pending, ctx) {
  const r = s.round;
  r.pending = pending;
  r.turnSeq += 1;
  r.deadline = s.settings.turnSeconds ? ctx.now + s.settings.turnSeconds * 1000 : null;
}

function clearPending(s) {
  s.round.pending = null;
  s.round.deadline = null;
}

function drawCard(s, ctx) {
  if (!s.draw.length) {
    if (!s.discard.length) {
      s.round.exhausted = true;
      return null;
    }
    s.draw = shuffle(s.discard, ctx.rng);
    s.discard = [];
    emit(s, { type: 'reshuffle' });
  }
  return s.draw.shift();
}

function runTask(s, task, ctx) {
  const r = s.round;
  switch (task.t) {
    case 'deal': {
      const at = task.seats.findIndex((id) => isActive(s, id));
      if (at === -1) {
        r.stack.pop();
        return;
      }
      const pid = task.seats[at];
      task.seats = task.seats.slice(at + 1);
      if (!task.seats.length) r.stack.pop();
      const card = drawCard(s, ctx);
      if (card !== null) giveCard(s, pid, card, null, 'deal');
      return;
    }
    case 'flip3': {
      if (!isActive(s, task.pid) || task.left === 0) {
        r.stack.pop();
        if (isActive(s, task.pid)) {
          // Set-aside actions are played in the order they came up.
          for (const card of [...task.deferred].reverse()) r.stack.push({ t: 'action', pid: task.pid, card });
        } else {
          s.discard.push(...task.deferred);
        }
        return;
      }
      task.left -= 1;
      const card = drawCard(s, ctx);
      if (card !== null) giveCard(s, task.pid, card, task, 'flip3');
      return;
    }
    case 'action':
      r.stack.pop();
      if (isActive(s, task.pid)) r.stack.push({ t: 'choose', kind: task.card, pid: task.pid, card: task.card });
      else s.discard.push(task.card);
      return;
    case 'choose': {
      const options = choiceOptions(s, task);
      if (!options.length) {
        r.stack.pop();
        s.discard.push(task.card);
        emit(s, { type: 'discarded', pid: task.pid, card: task.card });
      } else if (options.length === 1) {
        r.stack.pop();
        applyChoice(s, task, options[0], 'only');
      } else {
        ask(s, { kind: task.kind, pid: task.pid, options }, ctx);
      }
      return;
    }
    default:
      r.stack.pop();
  }
}

// Freeze and Flip Three can go to any active player, the drawer included. A spare Second
// Chance goes to another active player who doesn't already hold one.
function choiceOptions(s, task) {
  if (task.kind === 'second') {
    return activeIds(s).filter((id) => id !== task.pid && !s.round.hands[id].second);
  }
  return activeIds(s);
}

function giveCard(s, pid, card, flip3Task, via) {
  const r = s.round;
  const hand = r.hands[pid];
  emit(s, { type: 'draw', pid, card, via });
  if (isNumber(card)) {
    if (hand.cards.includes(card)) {
      if (hand.second) {
        hand.second = false;
        s.discard.push(card, 'second');
        emit(s, { type: 'saved', pid, card });
      } else {
        hand.cards.push(card);
        hand.status = 'bust';
        emit(s, { type: 'bust', pid, card });
      }
      return;
    }
    hand.cards.push(card);
    if (hasCollected(hand.cards)) {
      hand.status = 'collected';
      r.collected = pid;
      emit(s, { type: 'collect', pid });
    }
    return;
  }
  if (isModifier(card)) {
    hand.cards.push(card);
    return;
  }
  if (card === 'second') {
    if (!hand.second) hand.second = true;
    else r.stack.push({ t: 'choose', kind: 'second', pid, card });
    return;
  }
  // Freeze or Flip Three.
  if (flip3Task) {
    flip3Task.deferred.push(card);
    emit(s, { type: 'setAside', pid, card });
    return;
  }
  r.stack.push({ t: 'choose', kind: card, pid, card });
}

function applyChoice(s, task, target, how) {
  const hands = s.round.hands;
  if (task.kind === 'second') {
    hands[target].second = true;
  } else {
    // The played action card sits in front of the player it hit until the round ends.
    hands[target].cards.push(task.card);
    if (task.kind === 'freeze') hands[target].status = 'frozen';
    else s.round.stack.push({ t: 'flip3', pid: target, left: 3, deferred: [] });
  }
  emit(s, { type: task.kind, pid: task.pid, target, how });
}

function hit(s, pid, ctx) {
  clearPending(s);
  const card = drawCard(s, ctx);
  if (card !== null) giveCard(s, pid, card, null, 'hit');
  advance(s, ctx);
  return true;
}

function stay(s, pid, ctx, how) {
  clearPending(s);
  s.round.hands[pid].status = 'stayed';
  emit(s, { type: 'stay', pid, how });
  advance(s, ctx);
  return true;
}

function choose(s, target, ctx, how) {
  const task = s.round.stack.pop();
  clearPending(s);
  applyChoice(s, task, target, how);
  advance(s, ctx);
}

// The timer ran out, or the big screen skipped someone: Stay, or the gentlest target.
function resolveForThem(s, ctx, how) {
  const { kind, pid, options } = s.round.pending;
  if (kind === 'turn') return stay(s, pid, ctx, how);
  const pick = (ids) => ids[Math.floor(ctx.rng() * ids.length)];
  let target;
  if (kind === 'freeze') target = options.includes(pid) ? pid : pick(options);
  else if (kind === 'flip3') {
    const others = options.filter((id) => id !== pid);
    target = others.length ? pick(others) : pid;
  } else target = pick(options);
  choose(s, target, ctx, how);
  return true;
}

function endRound(s) {
  const r = s.round;
  // Cards still waiting to be played go to the discard pile.
  for (const task of r.stack) {
    if (task.card) s.discard.push(task.card);
    if (task.deferred) s.discard.push(...task.deferred);
  }
  r.stack = [];
  clearPending(s);
  r.over = true;
  r.points = {};
  for (const [id, hand] of Object.entries(r.hands)) {
    if (hand.status === 'left') continue;
    r.points[id] = roundPoints(hand);
    s.totals[id] = (s.totals[id] ?? 0) + r.points[id];
    // The hand stays on screen for the scores; the cards themselves are discarded.
    s.discard.push(...hand.cards);
    if (hand.second) s.discard.push('second');
  }
  s.history.push({ round: r.n, points: r.points });
  s.winner = findWinner(s.totals, seatedIds(s), s.settings.target);
  s.phase = s.winner ? 'gameOver' : 'roundEnd';
  emit(s, { type: 'roundEnd', n: r.n, winner: s.winner });
}

function removePlayer(s, pid, ctx) {
  const player = s.players[pid];
  if (!player || player.left) return false;
  if (s.phase === 'lobby') return kick(s, pid);
  player.left = true;
  emit(s, { type: 'left', pid });
  const r = s.round;
  if (r && !r.over && r.hands[pid]) {
    const hand = r.hands[pid];
    s.discard.push(...hand.cards);
    if (hand.second) s.discard.push('second');
    r.hands[pid] = { cards: [], status: 'left', second: false };
    const pending = r.pending;
    if (pending?.pid === pid) {
      if (pending.kind !== 'turn') s.discard.push(r.stack.pop().card);
      clearPending(s);
    } else if (pending && pending.kind !== 'turn' && pending.options.includes(pid)) {
      clearPending(s); // ask again without them
    }
    advance(s, ctx);
  } else if (s.phase === 'roundEnd' || s.phase === 'gameOver') {
    s.winner = findWinner(s.totals, seatedIds(s), s.settings.target);
    s.phase = s.winner ? 'gameOver' : 'roundEnd';
  }
  return true;
}
