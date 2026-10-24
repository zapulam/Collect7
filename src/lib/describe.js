// Words for statuses and events, shared by the big screen and the phones.
import { cardLabel } from './cards.js';

export const STATUS_LABELS = {
  active: 'Playing',
  stayed: 'Stayed',
  frozen: 'Frozen',
  bust: 'Bust',
  collected: 'Collect 7!',
  left: 'Left',
};

export const STATUS_STYLES = {
  active: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40',
  stayed: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40',
  frozen: 'bg-sky-500/20 text-sky-100 border-sky-300/50',
  bust: 'bg-red-500/20 text-red-200 border-red-400/50',
  collected: 'bg-amber-400/25 text-amber-100 border-amber-300/60',
  left: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

export const REJECTION_TEXT = {
  nameTaken: 'Someone already has that name. Try another.',
  badName: 'Type a name first.',
  full: 'This game is full (12 players).',
  started: 'This game has already started. Joining is locked.',
  badId: "This phone couldn't join. Reload the page and try again.",
};

const timedOut = (how) => (how === 'timeout' ? ' (time ran out)' : how === 'skipped' ? ' (skipped)' : '');

// A sentence for an event, or null for ones not worth announcing.
// `name(id)` gives a display name; pass meId to say "you".
export function describeEvent(event, name, meId) {
  const who = (id) => (id && id === meId ? 'You' : name(id));
  const whom = (id) => (id && id === meId ? 'you' : name(id));
  const self = event.pid === event.target;
  switch (event.type) {
    case 'bust':
      return { tone: 'bad', text: `${who(event.pid)} busted on a ${event.card}!` };
    case 'saved':
      return { tone: 'good', text: `Second Chance saved ${whom(event.pid)} from a duplicate ${event.card}` };
    case 'collect':
      return { tone: 'great', text: `${who(event.pid)} collected 7! +15 bonus` };
    case 'freeze':
      return {
        tone: 'cold',
        text: self ? `${who(event.pid)} froze ${event.pid === meId ? 'yourself' : 'themself'}${timedOut(event.how)}` : `${who(event.pid)} froze ${whom(event.target)}${timedOut(event.how)}`,
      };
    case 'flip3':
      return {
        tone: 'hot',
        text: self ? `${who(event.pid)} must flip three${timedOut(event.how)}` : `${who(event.pid)} made ${whom(event.target)} flip three${timedOut(event.how)}`,
      };
    case 'second':
      return { tone: 'good', text: `${who(event.pid)} gave ${whom(event.target)} a Second Chance` };
    case 'discarded':
      return { tone: 'info', text: `Nobody could take the spare ${cardLabel(event.card)}, so it's discarded` };
    case 'setAside':
      return { tone: 'info', text: `${cardLabel(event.card)} set aside until the Flip Three is done` };
    case 'stay':
      return { tone: 'info', text: event.how === 'chose' ? `${who(event.pid)} stayed` : `${who(event.pid)} stayed${timedOut(event.how)}` };
    case 'reshuffle':
      return { tone: 'info', text: 'Deck ran out: discard pile shuffled back in' };
    case 'left':
      return { tone: 'info', text: `${who(event.pid)} left the game` };
    case 'round':
      return { tone: 'info', text: `Round ${event.n}: ${who(event.dealer)} deal${event.dealer === meId ? '' : 's'}` };
    default:
      return null;
  }
}

export const TONE_STYLES = {
  bad: 'bg-red-600/90 text-white border-red-300/50',
  good: 'bg-emerald-600/90 text-white border-emerald-200/50',
  great: 'bg-gradient-to-r from-amber-400 to-pink-500 text-white border-amber-100/60',
  cold: 'bg-sky-600/90 text-white border-sky-200/50',
  hot: 'bg-orange-600/90 text-white border-orange-200/50',
  info: 'bg-gray-800/95 text-gray-100 border-gray-600/60',
};
