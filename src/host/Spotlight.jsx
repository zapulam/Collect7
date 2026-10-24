import { Crown, Heart, Snowflake } from 'lucide-react';
import Card from '../components/Card';
import { sortForDisplay } from '../lib/cards';
import { STATUS_LABELS, STATUS_STYLES } from '../lib/describe';
import { handScore, numbersIn } from '../lib/scoring';

// The player whose turn it is, large enough to read from across the room.
export default function Spotlight({ name, hand, total, target, isDealer, online, flip3Left }) {
  const live = hand.status === 'bust' ? 0 : handScore(hand.cards);
  const unique = new Set(numbersIn(hand.cards)).size;
  const cards = sortForDisplay(hand.cards);
  const lastIndex = hand.cards.length - 1;
  const cardSize = cards.length <= 6 ? '2xl' : 'xl';

  return (
    <section
      className="flex-1 min-h-0 flex flex-col items-center justify-center gap-5 short:gap-3 px-6 py-4 text-center"
      aria-label={`${name}'s hand`}
      data-testid="spotlight"
      data-status={hand.status}
    >
      <header className="flex flex-wrap items-center justify-center gap-3">
        <span className={`h-3 w-3 rounded-full ${online ? 'bg-emerald-400' : 'bg-gray-600'}`} title={online ? 'Phone connected' : 'Phone offline'} />
        <h2 className="text-5xl short:text-4xl font-black tracking-tight">{name}</h2>
        {isDealer && (
          <span className="rounded-lg bg-white/10 px-2 py-0.5 text-sm font-bold text-gray-300" title="Dealer">
            Dealer
          </span>
        )}
        {hand.second && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/25 px-2 py-0.5 text-sm font-bold text-rose-100" title="Holding a Second Chance">
            <Heart size={14} fill="currentColor" /> Second Chance
          </span>
        )}
        <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${STATUS_STYLES[hand.status]}`}>{STATUS_LABELS[hand.status]}</span>
      </header>

      <div
        className={`flex flex-wrap content-center justify-center gap-4 min-h-[10.5rem] max-w-6xl ${hand.status === 'bust' ? 'c7-shake' : ''}`}
        data-testid="spotlight-cards"
      >
        {cards.length ? (
          cards.map(({ card, i }) => <Card key={i} card={card} size={cardSize} bad={hand.status === 'bust' && i === lastIndex} />)
        ) : (
          <span className="self-center text-xl text-gray-500">No cards yet</span>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-center gap-x-12 gap-y-3">
        <div className="grid justify-items-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-gray-400">This round</span>
          <span
            className={`text-7xl short:text-6xl font-black tabular-nums leading-none ${hand.status === 'bust' ? 'text-red-400' : 'text-white'}`}
            data-testid="spotlight-score"
          >
            {live}
          </span>
        </div>
        <div className="grid justify-items-center gap-2">
          <span className="text-sm font-semibold uppercase tracking-widest text-gray-400">{unique} of 7 numbers</span>
          <span className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: 7 }, (_, n) => (
              <span key={n} className={`h-3 w-7 rounded-full ${n < unique ? 'bg-amber-300' : 'bg-white/10'}`} />
            ))}
          </span>
          {flip3Left != null && <span className="text-sm font-semibold text-orange-200">Flipping three… {flip3Left} to go</span>}
          {hand.status === 'frozen' && (
            <span className="inline-flex items-center gap-1 text-sm text-sky-200">
              <Snowflake size={14} /> Frozen
            </span>
          )}
        </div>
        <div className="grid justify-items-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-gray-400">Total</span>
          <span className="text-5xl short:text-4xl font-black tabular-nums leading-none" title={`First to ${target}`}>
            {total >= target && <Crown size={28} className="inline mr-2 text-amber-300 -mt-2" />}
            {total}
          </span>
        </div>
      </div>
    </section>
  );
}
