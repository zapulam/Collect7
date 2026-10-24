import { Crown, Heart, Snowflake, X } from 'lucide-react';
import Card from '../components/Card';
import { sortForDisplay } from '../lib/cards';
import { STATUS_LABELS, STATUS_STYLES } from '../lib/describe';
import { handScore, numbersIn } from '../lib/scoring';

const PANEL_STYLES = {
  active: 'bg-gray-900/75 border-white/10',
  stayed: 'bg-emerald-950/40 border-emerald-500/30',
  frozen: 'bg-sky-950/60 border-sky-400/40',
  bust: 'bg-red-950/50 border-red-500/40',
  collected: 'bg-amber-900/40 border-amber-300/60',
  left: 'bg-gray-900/40 border-white/5 opacity-40',
};

// Room for one row of cards, so panels don't jump when the first card lands.
const MIN_HEIGHT = { sm: 'min-h-14', md: 'min-h-20', lg: 'min-h-[5.5rem]', xl: 'min-h-[7.5rem]' };

const WAITING_ON = {
  turn: 'Hit or stay?',
  freeze: 'Choosing who to freeze…',
  flip3: 'Choosing who flips three…',
  second: 'Giving away a Second Chance…',
};

export default function PlayerPanel({
  name,
  hand,
  total,
  points,
  target,
  waitingOn,
  flip3Left,
  isDealer,
  online,
  seconds,
  cardSize,
  onRemove,
}) {
  const live = hand.status === 'bust' ? 0 : handScore(hand.cards);
  const shownPoints = points ?? live;
  const unique = new Set(numbersIn(hand.cards)).size;
  const cards = sortForDisplay(hand.cards);
  const lastIndex = hand.cards.length - 1;
  const glow = waitingOn ? 'c7-glow [--glow:rgba(129,140,248,0.75)]' : hand.status === 'collected' ? 'c7-glow [--glow:rgba(251,191,36,0.8)]' : '';

  return (
    <article
      className={`group relative flex flex-col gap-2.5 rounded-2xl border p-3.5 short:p-2.5 transition-colors ${PANEL_STYLES[hand.status]} ${glow}`}
      data-testid="player-panel"
      data-status={hand.status}
    >
      <header className="flex items-center gap-2 min-w-0">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${online ? 'bg-emerald-400' : 'bg-gray-600'}`}
          title={online ? 'Phone connected' : 'Phone offline'}
        />
        <h3 className={`truncate font-bold leading-tight ${cardSize === 'xl' ? 'text-2xl' : 'text-lg'}`}>{name}</h3>
        {isDealer && (
          <span className="shrink-0 rounded-md bg-white/10 px-1.5 text-[11px] font-bold text-gray-300" title="Dealer">
            D
          </span>
        )}
        {hand.second && (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-rose-500/25 px-1.5 py-0.5 text-[11px] font-bold text-rose-100" title="Holding a Second Chance">
            <Heart size={11} fill="currentColor" /> 2nd
          </span>
        )}
        <span className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[hand.status]}`}>
          {STATUS_LABELS[hand.status]}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 rounded-full p-1 text-gray-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/30 hover:text-white focus:opacity-100"
            aria-label={`Remove ${name} from the game`}
          >
            <X size={14} />
          </button>
        )}
      </header>

      <div className={`flex flex-wrap content-start gap-2 ${MIN_HEIGHT[cardSize]} ${hand.status === 'bust' ? 'c7-shake' : ''}`}>
        {cards.length ? (
          cards.map(({ card, i }) => (
            <Card key={i} card={card} size={cardSize} bad={hand.status === 'bust' && i === lastIndex} />
          ))
        ) : (
          <span className="self-center text-sm text-gray-500">No cards yet</span>
        )}
      </div>

      <footer className="mt-auto flex items-end justify-between gap-2">
        <div className="text-sm">
          {waitingOn ? (
            <span className="font-semibold text-indigo-200">
              {WAITING_ON[waitingOn]}
              {seconds != null && <span className="ml-2 tabular-nums text-indigo-100">{seconds}s</span>}
            </span>
          ) : flip3Left != null ? (
            <span className="font-semibold text-orange-200">Flipping three… {flip3Left} to go</span>
          ) : hand.status === 'frozen' ? (
            <span className="inline-flex items-center gap-1 text-sky-200">
              <Snowflake size={14} /> Frozen
            </span>
          ) : (
            <span className="text-gray-400 tabular-nums">{unique}/7 numbers</span>
          )}
        </div>
        <div className="text-right leading-tight">
          <div className={`text-sm font-semibold tabular-nums ${hand.status === 'bust' ? 'text-red-300' : 'text-gray-200'}`}>
            {hand.status === 'bust' ? 'Bust' : `+${shownPoints}`}
          </div>
          <div className="text-2xl font-black tabular-nums" title={`Total (first to ${target})`}>
            {total >= target && <Crown size={16} className="inline mr-1 text-amber-300 -mt-1" />}
            {total}
          </div>
        </div>
      </footer>
    </article>
  );
}
