import { Crown, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';
import Modal from '../components/Modal';
import { celebrate } from '../components/confetti';
import { primaryButton, secondaryButton } from '../components/buttons';
import { standings } from '../lib/scoring';

export default function GameOver({ state, onPlayAgain, onNewGame }) {
  const ids = standings(state.totals, state.order.filter((id) => !state.players[id]?.left));
  const winner = state.players[state.winner]?.name;

  useEffect(() => {
    celebrate({ particleCount: 220, spread: 120 });
    const id = setTimeout(() => celebrate({ particleCount: 160, spread: 140, origin: { y: 0.4 } }), 700);
    return () => clearTimeout(id);
  }, []);

  return (
    <Modal labelledBy="winner-title" className="w-full max-w-4xl p-6 short:p-5">
      <div className="text-center mb-5">
        <Crown className="mx-auto text-amber-300" size={44} />
        <h2 id="winner-title" className="text-5xl font-black mt-1">
          {winner} wins!
        </h2>
        <p className="text-gray-400 mt-1">
          {state.totals[state.winner]} points after {state.history.length} round{state.history.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm tabular-nums" data-testid="final-scores">
          <thead className="bg-white/5 text-gray-400">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Player</th>
              {state.history.map((h) => (
                <th key={h.round} className="px-2 py-2 text-right font-semibold">
                  R{h.round}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-semibold text-gray-200">Total</th>
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => (
              <tr key={id} className={id === state.winner ? 'bg-amber-400/10' : 'border-t border-white/5'}>
                <td className="px-3 py-2 font-bold whitespace-nowrap">
                  {id === state.winner && <Crown size={14} className="inline mr-1 text-amber-300 -mt-0.5" />}
                  {state.players[id].name}
                </td>
                {state.history.map((h) => (
                  <td key={h.round} className={`px-2 py-2 text-right ${h.points[id] ? 'text-gray-200' : 'text-gray-500'}`}>
                    {h.points[id] ?? '–'}
                  </td>
                ))}
                <td className="px-3 py-2 text-right text-lg font-black">{state.totals[id] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <button type="button" className={`${primaryButton} text-lg`} onClick={onPlayAgain}>
          <RotateCcw size={18} /> Play again, same players
        </button>
        <button type="button" className={secondaryButton} onClick={onNewGame}>
          New game
        </button>
      </div>
    </Modal>
  );
}
