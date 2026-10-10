import { CheckCircle2, Pencil } from 'lucide-react';
import Wordmark from '../components/Wordmark';
import { seatedIds } from '../lib/engine';
import Screen from './Screen';

export default function LobbyWait({ game, meId, hostOnline, onRename }) {
  const ids = seatedIds(game);
  return (
    <Screen>
      <Wordmark className="text-4xl" />
      <CheckCircle2 size={56} className="text-emerald-400 c7-pop" />
      <div>
        <h1 className="text-3xl font-black">You&apos;re in, {game.players[meId].name}!</h1>
        <p className="text-gray-400 mt-1">
          {hostOnline ? 'Waiting for the game master to start…' : 'The big screen is offline. Waiting for it to come back…'}
        </p>
      </div>
      <ul className="flex flex-wrap justify-center gap-2 max-w-sm">
        {ids.map((id) => (
          <li
            key={id}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${id === meId ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-200'}`}
          >
            {game.players[id].name}
          </li>
        ))}
      </ul>
      <p className="text-sm text-gray-400">
        First to {game.settings.target} points{game.settings.turnSeconds ? ` · ${game.settings.turnSeconds}s turns` : ''}
      </p>
      <button type="button" onClick={onRename} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200">
        <Pencil size={14} /> Change name
      </button>
    </Screen>
  );
}
