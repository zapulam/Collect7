// The Flip 7 deck. Cards are short strings so they travel well through the database:
//   numbers   '0'..'12'         (twelve 12s, eleven 11s ... one 1, and a single 0)
//   modifiers '+2' '+4' '+6' '+8' '+10' 'x2'
//   actions   'freeze' 'flip3' 'second'   (three of each)

export const NUMBERS = Array.from({ length: 13 }, (_, n) => n);
export const MODIFIERS = ['+2', '+4', '+6', '+8', '+10', 'x2'];
export const ACTIONS = ['freeze', 'flip3', 'second'];
export const DECK_SIZE = 94;

export const isNumber = (card) => typeof card === 'string' && /^(?:[0-9]|1[0-2])$/.test(card);
export const isModifier = (card) => MODIFIERS.includes(card);
export const isAction = (card) => ACTIONS.includes(card);
export const isCard = (card) => isNumber(card) || isModifier(card) || isAction(card);

// How many copies of a card the full deck holds.
export function copiesOf(card) {
  if (isNumber(card)) return Math.max(1, Number(card));
  if (isModifier(card)) return 1;
  if (isAction(card)) return 3;
  return 0;
}

export function buildDeck() {
  const deck = [];
  for (const n of NUMBERS) {
    for (let i = 0; i < Math.max(1, n); i++) deck.push(String(n));
  }
  deck.push(...MODIFIERS);
  for (const action of ACTIONS) deck.push(action, action, action);
  return deck;
}

// Fisher-Yates with an injectable rng (0 <= rng() < 1).
export function shuffle(cards, rng) {
  const out = [...cards];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Small seeded generator, so a reducer step is repeatable from its seed.
export function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ACTION_NAMES = { freeze: 'Freeze', flip3: 'Flip Three', second: 'Second Chance' };

export function cardLabel(card) {
  if (isAction(card)) return ACTION_NAMES[card];
  if (card === 'x2') return '×2';
  return card;
}

// One colour per number, like the real deck. Dark enough for white numerals.
export const NUMBER_COLORS = [
  '#64748b', // 0 slate
  '#8b5cf6', // 1 violet
  '#c026d3', // 2 fuchsia
  '#db2777', // 3 pink
  '#dc2626', // 4 red
  '#ea580c', // 5 orange
  '#d97706', // 6 amber
  '#65a30d', // 7 lime
  '#16a34a', // 8 green
  '#0d9488', // 9 teal
  '#0891b2', // 10 cyan
  '#2563eb', // 11 blue
  '#4f46e5', // 12 indigo
];

// Numbers first (in the order drawn), then modifiers, then played action cards.
export function sortForDisplay(cards) {
  const rank = (card) => (isNumber(card) ? 0 : isAction(card) ? 2 : 1);
  return cards.map((card, i) => ({ card, i })).sort((a, b) => rank(a.card) - rank(b.card) || a.i - b.i);
}
