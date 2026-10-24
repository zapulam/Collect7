import { Crown, Heart, Layers, Snowflake } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Card from '../components/Card';
import Odometer from '../components/Odometer';
import { FLIP_MS, STAGGER_MS } from '../hooks/useStage';
import { sortForDisplay } from '../lib/cards';
import { STATUS_LABELS, STATUS_STYLES } from '../lib/describe';
import { handScore, numbersIn } from '../lib/scoring';

const ACTION_NAMES = { freeze: 'Freeze', flip3: 'Flip Three', second: 'a Second Chance' };

const STAMPS = {
  bust: { text: 'Bust!', style: 'text-red-400 border-red-400' },
  stay: { text: 'Banked', style: 'text-emerald-300 border-emerald-300' },
  freeze: { text: 'Frozen', style: 'text-sky-200 border-sky-300' },
  collect: { text: 'Collect 7!', style: 'text-amber-300 border-amber-300' },
};

// A big word stamped over the hand once the cards have turned over.
function Stamp({ kind, delay, detail }) {
  const { text, style } = STAMPS[kind];
  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
      <div
        className={`c7-stamp rounded-2xl border-8 bg-gray-950/55 px-10 py-3 text-center backdrop-blur-sm ${style}`}
        style={{ animationDelay: `${delay}ms` }}
        role="status"
      >
        <span className="block text-8xl short:text-7xl font-black uppercase leading-none tracking-tight">{text}</span>
        {detail && <span className="block text-3xl font-bold mt-1">{detail}</span>}
      </div>
    </div>
  );
}

// The player whose turn it is, large enough to read from across the room. Cards turn over one
// at a time and the score only counts a card once it is face-up. `initialKnown` is how many
// cards the screen had already shown for this player, so a card dealt while someone else held
// the spotlight still flips when theirs comes up. `hold` is the result being shown, if any.
export default function Spotlight({ name, hand, total, target, isDealer, online, flip3Left, hold, initialKnown, actionCard, actionKey }) {
  const count = hand.cards.length;
  const known = useRef(Math.min(initialKnown, count));
  const firstNew = useRef(known.current);
  const delays = useRef(new Map()); // card index -> ms before it flips, kept for as long as the card is there
  const [revealed, setRevealed] = useState(known.current);

  if (count < known.current) {
    // A new round emptied the hand, so what is dealt now is all new.
    known.current = 0;
    delays.current.clear();
    if (revealed > 0) setRevealed(0);
  }
  if (count > known.current) {
    firstNew.current = known.current;
    for (let k = known.current; k < count; k++) delays.current.set(k, (k - known.current) * STAGGER_MS);
    known.current = count;
  }
  if (revealed > count) setRevealed(count);

  useEffect(() => {
    const timers = [];
    for (let k = firstNew.current; k < count; k++) {
      const wait = (delays.current.get(k) ?? 0) + FLIP_MS;
      timers.push(setTimeout(() => setRevealed((n) => Math.max(n, k + 1)), wait));
    }
    return () => timers.forEach(clearTimeout);
  }, [count]);

  const faceUp = Math.min(revealed, count);
  const allUp = faceUp >= count;
  // A bust or a seventh number is announced only once its card has turned over.
  const status = !allUp && (hand.status === 'bust' || hand.status === 'collected') ? 'active' : hand.status;
  const counted = hand.cards.slice(0, faceUp);
  const live = status === 'bust' ? 0 : handScore(counted);
  const unique = new Set(numbersIn(counted)).size;
  const cards = sortForDisplay(hand.cards);
  const lastIndex = count - 1;
  const cardSize = count <= 6 ? '2xl' : 'xl';
  const stamp = hold && STAMPS[hold.kind] ? hold : null;

  return (
    <section
      className="relative flex-1 min-h-0 flex flex-col items-center justify-center gap-5 short:gap-3 px-6 py-4 text-center overflow-hidden"
      aria-label={`${name}'s hand`}
      data-testid="spotlight"
      data-status={status}
    >
      {hold?.kind === 'bust' && (
        <div
          key={hold.id}
          className="c7-flash pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.45),transparent_70%)]"
          style={{ animationDelay: `${hold.revealMs}ms` }}
        />
      )}
      {hold?.kind === 'freeze' && (
        <div
          key={hold.id}
          className="c7-frost pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-300/25 via-sky-400/10 to-sky-200/25"
        />
      )}

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
        {(hold?.kind === 'flip3' || flip3Left != null) && (
          <span className="c7-pop inline-flex items-center gap-1 rounded-lg bg-orange-500/25 px-2 py-0.5 text-sm font-bold text-orange-100">
            <Layers size={14} /> Flip Three
          </span>
        )}
        <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>
      </header>

      <div
        className={`flex flex-wrap content-center justify-center gap-4 min-h-[10.5rem] max-w-6xl ${status === 'bust' ? 'c7-shake' : ''}`}
        data-testid="spotlight-cards"
      >
        {actionCard && (
          // An action card just drawn: it flips over here while its owner picks who gets it.
          <div key={actionKey} className="grid justify-items-center gap-2 pr-6 mr-2 border-r border-white/15">
            <div className="c7-glow rounded-3xl [--glow:rgba(251,191,36,0.7)]">
              <Card card={actionCard} size={cardSize} flipDelay={0} />
            </div>
            <span className="max-w-[10rem] text-sm font-semibold text-amber-200">
              {name} is choosing who gets {ACTION_NAMES[actionCard]}
            </span>
          </div>
        )}
        {cards.length ? (
          cards.map(({ card, i }) => (
            <Card
              key={i}
              card={card}
              size={cardSize}
              bad={status === 'bust' && i === lastIndex}
              animate={false}
              flipDelay={delays.current.get(i) ?? null}
            />
          ))
        ) : (
          !actionCard && <span className="self-center text-xl text-gray-500">No cards yet</span>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-center gap-x-12 gap-y-3">
        <div className="grid justify-items-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-gray-400">This round</span>
          <Odometer
            value={live}
            className={`text-7xl short:text-6xl font-black transition-colors ${status === 'bust' ? 'text-red-400' : 'text-white'}`}
          />
        </div>
        <div className="grid justify-items-center gap-2">
          <span className="text-sm font-semibold uppercase tracking-widest text-gray-400">{unique} of 7 numbers</span>
          <span className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: 7 }, (_, n) => (
              <span key={n} className={`h-3 w-7 rounded-full transition-colors duration-500 ${n < unique ? 'bg-amber-300' : 'bg-white/10'}`} />
            ))}
          </span>
          {flip3Left != null && <span className="text-sm font-semibold text-orange-200">Flipping three… {flip3Left} to go</span>}
          {status === 'frozen' && (
            <span className="inline-flex items-center gap-1 text-sm text-sky-200">
              <Snowflake size={14} /> Frozen
            </span>
          )}
        </div>
        <div className="grid justify-items-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-gray-400">Total</span>
          <span className="inline-flex items-center gap-2" title={`First to ${target}`}>
            {total >= target && <Crown size={28} className="text-amber-300" />}
            <Odometer value={total} className="text-5xl short:text-4xl font-black" />
          </span>
        </div>
      </div>

      {stamp && (
        <Stamp
          key={stamp.id}
          kind={stamp.kind}
          delay={stamp.kind === 'stay' || stamp.kind === 'freeze' ? 0 : stamp.revealMs}
          detail={stamp.kind === 'stay' ? `+${live} points` : stamp.kind === 'collect' ? '+15 bonus' : null}
        />
      )}
    </section>
  );
}
