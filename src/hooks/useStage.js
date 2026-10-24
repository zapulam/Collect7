import { useEffect, useRef, useState } from 'react';

// How long a card takes to turn over, and the gap between cards when several arrive at once.
export const FLIP_MS = 800;
export const STAGGER_MS = 650;

// How long the result stays on screen after the cards have turned over.
const LINGER_MS = { draw: 1300, flip3: 1600, bust: 2000, collect: 3000, stay: 2000, freeze: 2200 };

// The engine settles a whole turn in one step, so the big screen would jump straight to the next
// player. This picks the one moment worth staying on from a batch of new events: { id, pid, kind,
// revealMs (until the last card is face-up), ms (how long to stay) }, or null.
export function pickHold(events) {
  let hold = null;
  const draws = {};
  for (const e of events) {
    if (e.type === 'draw' && e.via !== 'deal') {
      draws[e.pid] = (draws[e.pid] ?? 0) + 1;
      hold = { kind: e.via === 'flip3' ? 'flip3' : 'draw', pid: e.pid };
    } else if (e.type === 'bust' || e.type === 'collect' || e.type === 'stay') {
      hold = { kind: e.type, pid: e.pid };
    } else if (e.type === 'freeze' || e.type === 'flip3') {
      hold = { kind: e.type, pid: e.target };
    }
  }
  if (!hold) return null;
  const cards = draws[hold.pid] ?? 0;
  const revealMs = cards ? (cards - 1) * STAGGER_MS + FLIP_MS : 0;
  return { ...hold, id: events.at(-1).id, revealMs, ms: revealMs + LINGER_MS[hold.kind] };
}

// The moment the big screen is holding on, or null. It clears itself when the time is up.
export function useStage(log) {
  const seen = useRef(log.at(-1)?.id ?? 0);
  const [hold, setHold] = useState(null);

  useEffect(() => {
    const last = log.at(-1)?.id ?? 0;
    if (last < seen.current) seen.current = 0; // a new game restarted the numbering
    const fresh = log.filter((e) => e.id > seen.current);
    if (!fresh.length) return;
    seen.current = last;
    const next = pickHold(fresh);
    if (next) setHold(next);
  }, [log]);

  useEffect(() => {
    if (!hold) return;
    const id = setTimeout(() => setHold((current) => (current === hold ? null : current)), hold.ms);
    return () => clearTimeout(id);
  }, [hold]);

  return hold;
}
