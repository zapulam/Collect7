import { isNumber } from './cards.js';

export const COLLECT_COUNT = 7;
export const COLLECT_BONUS = 15;

export function numbersIn(cards) {
  return cards.filter(isNumber).map(Number);
}

export function hasCollected(cards) {
  return new Set(numbersIn(cards)).size >= COLLECT_COUNT;
}

// Points a hand is worth if banked now: the number cards (doubled by x2), then the
// +modifiers, then the bonus for seven different numbers. x2 doubles the numbers only.
export function handScore(cards) {
  const numbers = numbersIn(cards).reduce((sum, n) => sum + n, 0);
  const doubled = cards.includes('x2') ? numbers * 2 : numbers;
  const plus = cards
    .filter((card) => card.startsWith('+'))
    .reduce((sum, card) => sum + Number(card.slice(1)), 0);
  return doubled + plus + (hasCollected(cards) ? COLLECT_BONUS : 0);
}

// What a player banks at the end of a round.
export function roundPoints(hand) {
  if (!hand || hand.status === 'bust' || hand.status === 'left') return 0;
  return handScore(hand.cards);
}

// Chance the next card busts this hand. deckLeft[n] is how many n's remain in the draw pile.
export function bustChance(cards, deckLeft, deckCount) {
  if (!deckCount) return 0;
  const risky = new Set(numbersIn(cards));
  let hits = 0;
  for (const n of risky) hits += deckLeft[n] ?? 0;
  return hits / deckCount;
}

// The game ends once a round leaves one player alone at the top with at least `target`.
export function findWinner(totals, playerIds, target) {
  let best = -Infinity;
  let leaders = [];
  for (const id of playerIds) {
    const total = totals[id] ?? 0;
    if (total > best) {
      best = total;
      leaders = [id];
    } else if (total === best) {
      leaders.push(id);
    }
  }
  return best >= target && leaders.length === 1 ? leaders[0] : null;
}

// Players sorted by total, highest first; ties keep seat order.
export function standings(totals, playerIds) {
  return [...playerIds].sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0));
}
