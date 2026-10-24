import { useEffect, useRef, useState } from 'react';
import { FLIP_MS, STAGGER_MS } from './useStage';

// Works out which cards in a hand are new and when each one should flip, so only new cards
// animate and several arriving together (a Flip Three) turn over one after another.
//
//   count        how many cards are in the hand
//   initialKnown cards already on screen when this mounted (they don't flip); default: all of them
//   resetKey     changes when a new round starts, so the cards dealt then flip too
//   onFlip(i)    a card starts to turn over, onLand(i) it is face-up (for sounds)
//
// Returns { delayFor(i), faceUp, allUp }: the ms before card i flips (null if it isn't new),
// how many cards are face-up so far, and whether they all are. Scores should only count the
// face-up cards, and a bust should only be announced once allUp.
export function useCardFlips(count, { initialKnown = count, resetKey = null, onFlip, onLand } = {}) {
  const known = useRef(Math.min(initialKnown, count));
  const firstNew = useRef(known.current);
  const delays = useRef(new Map()); // card index -> ms before it flips, kept for as long as the card is there
  const roundKey = useRef(resetKey);
  const [revealed, setRevealed] = useState(known.current);
  const callbacks = useRef({ onFlip, onLand });
  callbacks.current = { onFlip, onLand };
  const timers = useRef([]);
  const scheduled = useRef(new Set()); // card indices whose flip and reveal are already timed

  if (resetKey !== roundKey.current || count < known.current) {
    // A new round (or an emptied hand): whatever is dealt now is all new.
    roundKey.current = resetKey;
    known.current = 0;
    firstNew.current = 0;
    delays.current.clear();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    scheduled.current.clear();
    if (revealed > 0) setRevealed(0);
  }
  if (count > known.current) {
    firstNew.current = known.current;
    for (let k = known.current; k < count; k++) delays.current.set(k, (k - known.current) * STAGGER_MS);
    known.current = count;
  }
  if (revealed > count) setRevealed(count);

  // A card's timers keep running when another card arrives behind it, so they are only
  // cleared on a new round or when this unmounts.
  useEffect(() => {
    for (let k = firstNew.current; k < count; k++) {
      if (scheduled.current.has(k)) continue;
      scheduled.current.add(k);
      const start = delays.current.get(k) ?? 0;
      timers.current.push(setTimeout(() => callbacks.current.onFlip?.(k), start));
      timers.current.push(
        setTimeout(() => {
          setRevealed((n) => Math.max(n, k + 1));
          callbacks.current.onLand?.(k);
        }, start + FLIP_MS)
      );
    }
  }, [count, resetKey]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      scheduled.current.clear();
    },
    []
  );

  const faceUp = Math.min(revealed, count);
  return { delayFor: (i) => delays.current.get(i) ?? null, faceUp, allUp: faceUp >= count };
}
