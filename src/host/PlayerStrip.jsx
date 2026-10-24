import { Crown, Heart, X } from 'lucide-react';
import Card from '../components/Card';
import Odometer from '../components/Odometer';
import { sortForDisplay } from '../lib/cards';
import { STATUS_LABELS, STATUS_STYLES } from '../lib/describe';
import { handScore } from '../lib/scoring';
import { stackMargin } from '../lib/stack';

const TILE_STYLES = {
  active: 'bg-gray-900/75 border-white/10',
  stayed: 'bg-emerald-950/40 border-emerald-500/30',
  frozen: 'bg-sky-950/60 border-sky-400/40',
  bust: 'bg-red-950/50 border-red-500/40',
  collected: 'bg-amber-900/40 border-amber-300/60',
  left: 'bg-gray-900/40 border-white/5 opacity-40',
};

// Everyone, always in seat order: their total and a small hand whose cards overlap a little so
// a full table fits. The player in the spotlight is marked in place.
export default function PlayerStrip({ players, target, currentId, upNext, onRemove }) {
  if (!players.length) return null;
  return (
    <footer className="border-t border-white/10 bg-gray-950/60 backdrop-blur px-4 py-3 short:py-2" aria-label="Players">
      <ul className="flex flex-wrap justify-center gap-2.5 short:gap-2" data-testid="strip">
        {players.map(({ id, name, hand, total, online, isDealer }) => {
          const live = hand.status === 'bust' ? 0 : handScore(hand.cards);
          const current = currentId === id;
          const next = !current && upNext === id;
          const overlap = stackMargin(hand.cards.length);
          return (
            <li
              key={id}
              className={`group relative grid gap-1.5 w-40 rounded-2xl border p-2.5 transition-colors ${TILE_STYLES[hand.status]} ${
                current ? 'ring-2 ring-amber-300/80' : next ? 'ring-2 ring-indigo-400/70' : ''
              }`}
              data-testid="strip-tile"
              data-status={hand.status}
              data-current={current}
              aria-current={current ? 'true' : undefined}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`h-2 w-2 shrink-0 rounded-full ${online ? 'bg-emerald-400' : 'bg-gray-600'}`} title={online ? 'Phone connected' : 'Phone offline'} />
                <h3 className="truncate font-bold leading-tight">{name}</h3>
                {isDealer && <span className="shrink-0 rounded bg-white/10 px-1 text-[10px] font-bold text-gray-300">D</span>}
                {hand.second && <Heart size={12} className="shrink-0 text-rose-300" fill="currentColor" aria-label="Second Chance" />}
                <span className="ml-auto inline-flex items-center gap-1 text-xl font-black" title={`Total (first to ${target})`}>
                  {total >= target && <Crown size={14} className="text-amber-300" />}
                  <Odometer value={total} />
                </span>
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(id)}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-800 p-0.5 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white focus:opacity-100"
                    aria-label={`Remove ${name} from the game`}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="flex flex-nowrap items-center h-10">
                {hand.cards.length ? (
                  sortForDisplay(hand.cards).map(({ card, i }, n) => (
                    <Card key={i} card={card} size="xs" animate={false} style={n ? { marginLeft: overlap } : undefined} />
                  ))
                ) : (
                  <span className="text-xs text-gray-500">No cards yet</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className={`rounded-full border px-2 py-0.5 font-semibold ${
                    current
                      ? 'bg-amber-400/25 text-amber-100 border-amber-300/60'
                      : next
                        ? 'bg-indigo-500/25 text-indigo-100 border-indigo-300/50'
                        : STATUS_STYLES[hand.status]
                  }`}
                >
                  {current ? 'Playing now' : next ? 'Up next' : STATUS_LABELS[hand.status]}
                </span>
                <span className={`font-semibold tabular-nums ${hand.status === 'bust' ? 'text-red-300' : 'text-gray-200'}`}>
                  {hand.status === 'bust' ? 'Bust' : `+${live}`}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </footer>
  );
}
