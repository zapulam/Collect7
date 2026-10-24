import { Crown } from 'lucide-react';
import { useEffect } from 'react';
import { celebrate } from '../components/confetti';
import { standings } from '../lib/scoring';

// Shown between rounds and at the end: what you banked and where everyone stands.
export default function PhoneScores({ game, meId }) {
  const r = game.round;
  const over = game.phase === 'gameOver';
  const ids = standings(game.totals, game.order.filter((id) => !game.players[id]?.left));
  const mine = r.points?.[meId] ?? 0;
  const status = r.hands[meId]?.status;
  const won = over && game.winner === meId;

  useEffect(() => {
    if (won) celebrate();
  }, [won]);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 c7-fade-in">
      <div className="c7-sheet w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-gray-900 px-5 pt-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] grid gap-4" data-testid="phone-scores">
        {over ? (
          <div className="text-center">
            <Crown size={40} className="mx-auto text-amber-300" />
            <h2 className="text-3xl font-black mt-1">{won ? 'You win!' : `${game.players[game.winner]?.name} wins!`}</h2>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm uppercase tracking-widest text-gray-400">Round {r.n} done</p>
            <h2 className={`text-4xl font-black mt-1 ${status === 'bust' ? 'text-red-300' : 'text-emerald-300'}`}>
              {status === 'bust' ? 'Bust' : `+${mine}`}
            </h2>
          </div>
        )}
        <ol className="grid gap-1.5">
          {ids.map((id, rank) => (
            <li
              key={id}
              className={`grid grid-cols-[1.5rem_1fr_auto_3.5rem] items-center gap-2 rounded-xl px-3 py-2 ${
                id === meId ? 'bg-indigo-500/25 ring-1 ring-indigo-400/60' : 'bg-white/5'
              }`}
            >
              <span className="text-gray-400 font-bold tabular-nums">{rank + 1}</span>
              <span className="truncate font-semibold">
                {game.winner === id && <Crown size={14} className="inline mr-1 text-amber-300 -mt-0.5" />}
                {id === meId ? 'You' : game.players[id]?.name}
              </span>
              <span className="text-sm tabular-nums text-gray-400">+{r.points?.[id] ?? 0}</span>
              <span className="text-right text-xl font-black tabular-nums">{game.totals[id] ?? 0}</span>
            </li>
          ))}
        </ol>
        <p className="text-center text-sm text-gray-400">
          {over ? 'Thanks for playing! Waiting for the game master.' : `First to ${game.settings.target}. Waiting for the next round…`}
        </p>
      </div>
    </div>
  );
}
