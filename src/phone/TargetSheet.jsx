import { Heart, Layers, Snowflake } from 'lucide-react';
import { useState } from 'react';
import { STATUS_LABELS } from '../lib/describe';
import { handScore, numbersIn } from '../lib/scoring';

const COPY = {
  freeze: {
    Icon: Snowflake,
    title: 'Freeze someone',
    note: 'They bank their points now and sit out the rest of the round.',
    verb: (n) => `Freeze ${n}`,
    color: 'bg-sky-600 hover:bg-sky-500',
  },
  flip3: {
    Icon: Layers,
    title: 'Flip Three',
    note: 'They must take the next three cards, one at a time.',
    verb: (n) => `${n} flips three`,
    color: 'bg-orange-600 hover:bg-orange-500',
  },
  second: {
    Icon: Heart,
    title: 'Give away a Second Chance',
    note: 'You can only hold one, so pass this one to another player.',
    verb: (n) => `Give it to ${n}`,
    color: 'bg-rose-600 hover:bg-rose-500',
  },
};

// Bottom sheet for picking who an action card goes to.
export default function TargetSheet({ pending, game, meId, seconds, busy, onChoose }) {
  const [picked, setPicked] = useState(null);
  const { Icon, title, note, verb, color } = COPY[pending.kind];
  const name = (id) => (id === meId ? 'yourself' : game.players[id]?.name);
  const chosen = pending.options.includes(picked) ? picked : null;
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="c7-sheet w-full max-w-md max-h-[88dvh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-gray-900 px-5 pt-2.5 pb-[max(env(safe-area-inset-bottom),1.5rem)] grid gap-3"
      >
        <div className="h-1.5 w-10 justify-self-center rounded-full bg-gray-600" />
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${color}`}>
            <Icon size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="sheet-title" className="text-2xl font-black">
              {title}
            </h2>
            <p className="text-sm text-gray-400">{note}</p>
          </div>
          {seconds != null && (
            <span className={`text-xl font-black tabular-nums ${seconds <= 5 ? 'text-red-400' : 'text-gray-300'}`}>{seconds}s</span>
          )}
        </div>
        <ul className="grid gap-2" data-testid="target-options">
          {pending.options.map((id) => {
            const hand = game.round.hands[id];
            const selected = chosen === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setPicked(id)}
                  aria-pressed={selected}
                  className={`w-full min-h-[56px] flex items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-left transition-colors ${
                    selected ? 'border-indigo-400 bg-indigo-500/25' : 'border-white/10 bg-white/5 active:bg-white/10'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-lg font-bold">{id === meId ? 'You' : game.players[id]?.name}</span>
                    <span className="block text-xs text-gray-400">
                      {STATUS_LABELS[hand.status]} · {new Set(numbersIn(hand.cards)).size}/7 numbers
                    </span>
                  </span>
                  <span className="text-lg font-black tabular-nums text-gray-200">+{handScore(hand.cards)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          disabled={!chosen || busy}
          onClick={() => onChoose(chosen)}
          className={`min-h-[56px] rounded-2xl text-lg font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-40 ${color}`}
          data-testid="confirm-target"
        >
          {busy ? 'Sending…' : chosen ? verb(name(chosen)) : 'Pick a player'}
        </button>
      </div>
    </div>
  );
}
