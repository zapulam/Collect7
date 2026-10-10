import { ArrowRight } from 'lucide-react';
import Modal from '../components/Modal';
import { primaryButton } from '../components/buttons';
import { STATUS_LABELS, STATUS_STYLES } from '../lib/describe';
import { standings } from '../lib/scoring';

// End of a round: what everyone banked and where the totals stand.
export default function RoundScores({ state, onNext }) {
  const r = state.round;
  const ids = standings(state.totals, Object.keys(r.points ?? {}).filter((id) => !state.players[id]?.left));
  const target = state.settings.target;
  return (
    <Modal labelledBy="round-title" className="w-full max-w-2xl p-6 short:p-5">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h2 id="round-title" className="text-3xl font-black">
          Round {r.n} scores
        </h2>
        <span className="text-gray-400">First to {target}</span>
      </div>
      <ol className="grid gap-2" data-testid="round-scores">
        {ids.map((id, rank) => {
          const status = r.hands[id]?.status ?? 'stayed';
          const total = state.totals[id] ?? 0;
          return (
            <li key={id} className="grid grid-cols-[2rem_1fr_auto_4.5rem_5rem] items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
              <span className="text-gray-400 font-bold tabular-nums">{rank + 1}</span>
              <span className="min-w-0">
                <span className="block truncate font-bold text-lg">{state.players[id]?.name}</span>
                <span className="block h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400"
                    style={{ width: `${Math.min(100, (total / target) * 100)}%` }}
                  />
                </span>
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
                {status === 'active' ? 'Banked' : STATUS_LABELS[status]}
              </span>
              <span className={`text-right font-semibold tabular-nums ${r.points[id] ? 'text-emerald-300' : 'text-gray-500'}`}>
                +{r.points[id] ?? 0}
              </span>
              <span className="text-right text-2xl font-black tabular-nums">{total}</span>
            </li>
          );
        })}
      </ol>
      <button type="button" className={`${primaryButton} w-full mt-6 text-lg py-4`} onClick={onNext} autoFocus>
        Next round <ArrowRight size={20} />
      </button>
    </Modal>
  );
}
