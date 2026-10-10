import { Play, X } from 'lucide-react';
import Wordmark from '../components/Wordmark';
import { primaryButton } from '../components/buttons';
import { MAX_PLAYERS, MIN_PLAYERS, seatedIds } from '../lib/engine';
import JoinPanel from './JoinPanel';
import RelayStatus from './RelayStatus';
import Settings from './Settings';

export default function Lobby({ roomId, state, relay, act, onNewGame }) {
  const ids = seatedIds(state);
  const canStart = ids.length >= MIN_PLAYERS && relay.status === 'live';
  return (
    <main className="min-h-dvh text-gray-100 flex flex-col">
      <header className="flex items-center justify-between gap-4 px-6 py-4 short:py-2">
        <Wordmark className="text-3xl" />
        <div className="flex items-center gap-5">
          <RelayStatus relay={relay} />
          <button type="button" onClick={onNewGame} className="text-sm text-gray-400 hover:text-gray-200">
            Close room
          </button>
        </div>
      </header>

      <div className="flex-1 grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8 px-6 pb-8 items-center max-w-6xl w-full mx-auto">
        <section className="grid gap-4 justify-items-center">
          <h2 className="text-2xl font-bold">Scan to join</h2>
          <JoinPanel roomId={roomId} />
        </section>

        <section className="grid gap-6 rounded-3xl bg-gray-900/70 border border-white/10 p-6 short:p-5 shadow-2xl backdrop-blur">
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-bold">Players</h2>
              <span className="text-sm text-gray-400 tabular-nums">
                {ids.length} / {MAX_PLAYERS}
              </span>
            </div>
            {ids.length ? (
              <ul className="flex flex-wrap gap-2" data-testid="lobby-players">
                {ids.map((id) => (
                  <li
                    key={id}
                    className="c7-pop group inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 pl-3 pr-1.5 py-1.5"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${relay.online.has(id) ? 'bg-emerald-400' : 'bg-gray-500'}`}
                      title={relay.online.has(id) ? 'Online' : 'Offline'}
                    />
                    <span className="font-semibold">{state.players[id].name}</span>
                    <button
                      type="button"
                      onClick={() => act({ type: 'kick', playerId: id })}
                      className="rounded-full p-1 text-gray-400 hover:bg-red-500/30 hover:text-white"
                      aria-label={`Remove ${state.players[id].name}`}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">Waiting for players to scan the code…</p>
            )}
          </div>

          <Settings settings={state.settings} act={act} />

          <div className="grid gap-2">
            <button
              type="button"
              className={`${primaryButton} text-lg py-4`}
              disabled={!canStart}
              onClick={() => act({ type: 'start' })}
            >
              <Play size={20} /> Start game
            </button>
            <p className="text-center text-xs text-gray-400">
              {ids.length < MIN_PLAYERS
                ? `Need at least ${MIN_PLAYERS} players.`
                : 'Joining locks once the game starts. Players can still reconnect on the same phone.'}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
