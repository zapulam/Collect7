// What goes through the database. The big screen publishes publicView(state) (never the
// deck order or anyone's clientId) and phones read it back through fromWire().
// Realtime Database drops empty arrays and objects, can hand arrays back as objects, and
// rejects `undefined`, so everything is normalized on the way in and out.
import { NUMBERS, isCard } from './cards.js';
import { CHOICE_KINDS, DEFAULT_PACE, NAME_MAX, paceOf } from './engine.js';

const PHASES = ['lobby', 'playing', 'roundEnd', 'gameOver'];
const STATUSES = ['active', 'stayed', 'frozen', 'bust', 'collected', 'left'];
const PENDING_KINDS = ['turn', ...CHOICE_KINDS];
const ID_RE = /^[a-z0-9]{6,32}$/;

export const isId = (value) => typeof value === 'string' && ID_RE.test(value);

export function publicView(s) {
  if (!s) return null;
  const r = s.round;
  const flip3 = r?.stack.findLast((task) => task.t === 'flip3');
  return {
    v: 1,
    gameId: s.gameId,
    phase: s.phase,
    settings: { ...s.settings, pace: paceOf(s) },
    order: s.order,
    players: Object.fromEntries(
      Object.entries(s.players).map(([id, p]) => [id, p.left ? { name: p.name, left: true } : { name: p.name }])
    ),
    totals: s.totals,
    history: s.history,
    round: r && {
      n: r.n,
      dealer: r.dealer,
      hands: r.hands,
      pending: r.pending,
      turnSeq: r.turnSeq,
      deadline: r.deadline,
      unlockAt: r.unlockAt,
      flip3: flip3 ? { pid: flip3.pid, left: flip3.left } : null,
      points: r.points,
      over: r.over,
      collected: r.collected,
    },
    deck: {
      count: s.draw.length,
      left: NUMBERS.map((n) => s.draw.filter((card) => card === String(n)).length),
    },
    discardCount: s.discard.length,
    log: s.log,
    seq: s.seq,
    winner: s.winner,
    rejections: s.rejections,
  };
}

// Drops undefined (which the database rejects); nulls simply aren't stored.
export const toWire = (view) => JSON.parse(JSON.stringify(view ?? null));

function list(value) {
  if (Array.isArray(value)) return value.filter((item) => item != null);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => value[key])
      .filter((item) => item != null);
  }
  return [];
}

const record = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const num = (value, fallback = 0) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const str = (value) => (typeof value === 'string' ? value : null);

function hand(raw) {
  const h = record(raw);
  return {
    cards: list(h.cards).filter(isCard),
    status: STATUSES.includes(h.status) ? h.status : 'active',
    second: h.second === true,
  };
}

function pending(raw) {
  if (!raw || !PENDING_KINDS.includes(raw.kind) || !isId(raw.pid)) return null;
  return { kind: raw.kind, pid: raw.pid, options: list(raw.options).filter(isId) };
}

function numbers(raw) {
  return Object.fromEntries(Object.entries(record(raw)).map(([id, n]) => [id, num(n)]));
}

export function fromWire(raw) {
  if (!raw || typeof raw !== 'object' || !PHASES.includes(raw.phase)) return null;
  const r = raw.round && typeof raw.round === 'object' ? raw.round : null;
  const players = Object.fromEntries(
    Object.entries(record(raw.players)).map(([id, p]) => [
      id,
      { name: String(record(p).name ?? '').slice(0, NAME_MAX), left: record(p).left === true },
    ])
  );
  const left = list(raw.deck?.left).map((n) => num(n));
  return {
    gameId: str(raw.gameId),
    phase: raw.phase,
    settings: {
      target: num(raw.settings?.target, 200),
      turnSeconds: num(raw.settings?.turnSeconds),
      pace: num(raw.settings?.pace, DEFAULT_PACE),
    },
    order: list(raw.order).filter((id) => isId(id) && players[id]),
    players,
    totals: numbers(raw.totals),
    history: list(raw.history).map((h) => ({ round: num(h?.round), points: numbers(h?.points) })),
    round: r && {
      n: num(r.n, 1),
      dealer: str(r.dealer),
      hands: Object.fromEntries(Object.entries(record(r.hands)).map(([id, h]) => [id, hand(h)])),
      pending: pending(r.pending),
      turnSeq: num(r.turnSeq),
      deadline: typeof r.deadline === 'number' ? r.deadline : null,
      unlockAt: typeof r.unlockAt === 'number' ? r.unlockAt : null,
      flip3: r.flip3 && isId(r.flip3.pid) ? { pid: r.flip3.pid, left: num(r.flip3.left) } : null,
      points: r.points ? numbers(r.points) : null,
      over: r.over === true,
      collected: str(r.collected),
    },
    deck: { count: num(raw.deck?.count), left: NUMBERS.map((n) => left[n] ?? 0) },
    discardCount: num(raw.discardCount),
    log: list(raw.log).filter((e) => e && typeof e.type === 'string' && typeof e.id === 'number'),
    seq: num(raw.seq),
    winner: str(raw.winner),
    rejections: Object.fromEntries(
      Object.entries(record(raw.rejections)).map(([id, r]) => [id, { reason: String(record(r).reason ?? ''), n: num(record(r).n) }])
    ),
  };
}

// Turns a raw request from a phone into a reducer action, or null if it's malformed.
// Who may do what is checked by the reducer (gameReducer/phoneMayAct).
export function sanitizeRequest(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { type, clientId, playerId, gameId } = raw;
  if (!isId(clientId) || !isId(playerId) || typeof gameId !== 'string') return null;
  const base = { source: 'phone', clientId, playerId, gameId };
  switch (type) {
    case 'join':
      return typeof raw.name === 'string' ? { ...base, type, name: raw.name.slice(0, 64) } : null;
    case 'hit':
    case 'stay':
      return Number.isInteger(raw.turnSeq) ? { ...base, type, turnSeq: raw.turnSeq } : null;
    case 'choose':
      return Number.isInteger(raw.turnSeq) && isId(raw.target)
        ? { ...base, type, turnSeq: raw.turnSeq, target: raw.target }
        : null;
    default:
      return null;
  }
}
