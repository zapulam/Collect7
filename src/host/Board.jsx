import { Layers, QrCode, SkipForward, Timer, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import EventFeed from '../components/EventFeed';
import Modal from '../components/Modal';
import Wordmark from '../components/Wordmark';
import { celebrate } from '../components/confetti';
import { dangerButton, secondaryButton } from '../components/buttons';
import { useCountdown } from '../hooks/useCountdown';
import { randomId } from '../lib/room';
import GameOver from './GameOver';
import JoinPanel from './JoinPanel';
import PlayerPanel from './PlayerPanel';
import RelayStatus from './RelayStatus';
import RoundScores from './RoundScores';
import Settings from './Settings';
import Spotlight from './Spotlight';
import PlayerStrip from './PlayerStrip';

// Columns for 1..12 players, so every hand fits on one screen.
const COLUMNS = [1, 1, 2, 3, 2, 3, 3, 4, 4, 3, 4, 4, 4];
const GRID = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };

const ASKING = {
  turn: (n) => `${n}: hit or stay?`,
  freeze: (n) => `${n} is choosing who to freeze`,
  flip3: (n) => `${n} is choosing who flips three`,
  second: (n) => `${n} is giving away a Second Chance`,
};

export default function Board({ roomId, state, relay, act, offset, onNewGame }) {
  const r = state.round;
  const [dialog, setDialog] = useState(null); // 'join' | 'settings' | 'newGame' | { remove: id }
  const rawSeconds = useCountdown(r?.deadline, offset);
  // The timer starts once the pause between turns is over, so it never reads above its length.
  const seconds = rawSeconds == null ? null : Math.min(rawSeconds, state.settings.turnSeconds);
  const gate = useCountdown(r?.unlockAt ?? null, offset);
  const name = useCallback((id) => state.players[id]?.name ?? 'Someone', [state.players]);
  const onEvent = useCallback((event) => {
    if (event.type === 'collect') celebrate();
  }, []);

  if (!r) return null;
  const shown = state.order.filter((id) => r.hands[id]);
  const columns = COLUMNS[Math.min(shown.length, 12)];
  const cardSize = shown.length <= 4 ? 'xl' : shown.length <= 6 ? 'lg' : shown.length <= 9 ? 'md' : 'sm';
  const pending = state.phase === 'playing' ? r.pending : null;
  const flip3 = r.stack?.findLast((task) => task.t === 'flip3');

  // Whose hand fills the screen: whoever the game is waiting on, else the last player asked.
  const inPlay = state.phase === 'playing';
  const seats = shown.filter((id) => r.hands[id].status !== 'left');
  const focusId = [pending?.pid, flip3?.pid, r.cursor].find((id) => seats.includes(id)) ?? seats[0];
  const afterFocus = seats.slice(seats.indexOf(focusId) + 1).concat(seats.slice(0, seats.indexOf(focusId)));
  const upNext = inPlay && pending?.kind === 'turn' ? (afterFocus.find((id) => r.hands[id].status === 'active') ?? null) : null;
  const strip = seats
    .filter((id) => id !== focusId)
    .map((id) => ({
      id,
      name: name(id),
      hand: r.hands[id],
      total: state.totals[id] ?? 0,
      online: relay.online.has(id),
      isDealer: r.dealer === id,
    }));

  return (
    <main className="min-h-dvh text-gray-100 flex flex-col">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 short:py-2 border-b border-white/5 bg-gray-950/40 backdrop-blur">
        <Wordmark className="text-2xl" />
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-bold">Round {r.n}</span>
          <span className="text-gray-400">First to {state.settings.target}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-300">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1" title="Cards left in the deck">
            <Layers size={14} /> <span className="tabular-nums">{state.draw.length}</span> in deck
          </span>
          <span className="text-gray-500 tabular-nums" title="Discard pile">
            {state.discard.length} discarded
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <RelayStatus relay={relay} />
          <button type="button" className={`${secondaryButton} !px-3 !py-2`} onClick={() => setDialog('join')} title="Show the join code">
            <QrCode size={18} />
          </button>
          <button type="button" className={`${secondaryButton} !px-3 !py-2`} onClick={() => setDialog('settings')} title="Turn timer">
            <Timer size={18} />
          </button>
          <button type="button" className={`${secondaryButton} !px-3 !py-2 text-sm`} onClick={() => setDialog('newGame')}>
            New game
          </button>
        </div>
      </header>

      <div className="relative flex items-center justify-center gap-4 px-5 py-3 short:py-2 min-h-14">
        {pending ? (
          <>
            <p className="text-xl font-bold" data-testid="asking">
              {gate > 0 ? `${name(pending.pid)} is up next…` : ASKING[pending.kind](name(pending.pid))}
              {gate > 0 && <span className="ml-3 tabular-nums text-indigo-200">{gate}s</span>}
              {gate === 0 && seconds != null && <span className={`ml-3 tabular-nums ${seconds <= 5 ? 'text-red-400' : 'text-indigo-200'}`}>{seconds}s</span>}
            </p>
            <button
              type="button"
              className={`${secondaryButton} !py-1.5 text-sm`}
              onClick={() => act({ type: 'skip', turnSeq: r.turnSeq })}
              title={pending.kind === 'turn' ? 'Make them stay' : 'Choose for them'}
            >
              <SkipForward size={16} /> {pending.kind === 'turn' ? 'Stay for them' : 'Choose for them'}
            </button>
          </>
        ) : (
          <p className="text-gray-400">{state.phase === 'playing' ? 'Dealing…' : 'Round over'}</p>
        )}
        <EventFeed log={state.log} name={name} onEvent={onEvent} className="absolute left-1/2 top-full z-30 -translate-x-1/2 mt-1 w-max max-w-[90vw]" />
      </div>

      {inPlay ? (
        <>
          <Spotlight
            name={name(focusId)}
            hand={r.hands[focusId]}
            total={state.totals[focusId] ?? 0}
            target={state.settings.target}
            isDealer={r.dealer === focusId}
            online={relay.online.has(focusId)}
            flip3Left={flip3?.pid === focusId ? flip3.left : null}
          />
          <PlayerStrip players={strip} target={state.settings.target} upNext={upNext} onRemove={(id) => setDialog({ remove: id })} />
        </>
      ) : (
        <section className={`grid ${GRID[columns]} gap-4 short:gap-2 px-5 pb-5 flex-1 content-center`}>
          {shown.map((id) => (
            <PlayerPanel
              key={id}
              name={name(id)}
              hand={r.hands[id]}
              total={state.totals[id] ?? 0}
              points={r.over ? (r.points?.[id] ?? 0) : null}
              target={state.settings.target}
              waitingOn={pending?.pid === id ? pending.kind : null}
              seconds={pending?.pid === id ? seconds : null}
              flip3Left={flip3?.pid === id ? flip3.left : null}
              isDealer={r.dealer === id}
              online={relay.online.has(id)}
              cardSize={cardSize}
              onRemove={state.players[id]?.left ? null : () => setDialog({ remove: id })}
            />
          ))}
        </section>
      )}

      {state.phase === 'roundEnd' && !dialog && <RoundScores state={state} onNext={() => act({ type: 'nextRound' })} />}
      {state.phase === 'gameOver' && !dialog && (
        <GameOver state={state} onPlayAgain={() => act({ type: 'playAgain', gameId: randomId() })} onNewGame={onNewGame} />
      )}

      {dialog === 'join' && (
        <Modal onClose={() => setDialog(null)} labelledBy="join-title" className="p-6 w-full max-w-md">
          <h2 id="join-title" className="text-2xl font-bold text-center mb-1">
            Reconnect a phone
          </h2>
          <p className="text-center text-sm text-gray-400 mb-4">
            The game has started, so new players can&apos;t join. Players can scan this to get back in on the same phone.
          </p>
          <JoinPanel roomId={roomId} size="min(300px, 50dvh)" />
        </Modal>
      )}
      {dialog === 'settings' && (
        <Modal onClose={() => setDialog(null)} labelledBy="settings-title" className="p-6 w-full max-w-md">
          <h2 id="settings-title" className="text-2xl font-bold mb-4">
            Settings
          </h2>
          <Settings settings={state.settings} act={act} lockTarget />
          <p className="text-sm text-gray-400 mt-4">Playing to {state.settings.target}. A new timer applies from the next decision.</p>
          <button type="button" className={`${secondaryButton} w-full mt-5`} onClick={() => setDialog(null)}>
            Done
          </button>
        </Modal>
      )}
      {dialog === 'newGame' && (
        <Modal onClose={() => setDialog(null)} labelledBy="new-title" className="p-6 w-full max-w-md">
          <h2 id="new-title" className="text-2xl font-bold">
            End this game?
          </h2>
          <p className="text-gray-400 mt-2">This closes the room. Everyone will need to scan a new code.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" className={secondaryButton} onClick={() => setDialog(null)}>
              Keep playing
            </button>
            <button type="button" className={dangerButton} onClick={onNewGame}>
              End game
            </button>
          </div>
        </Modal>
      )}
      {dialog?.remove && (
        <Modal onClose={() => setDialog(null)} labelledBy="remove-title" className="p-6 w-full max-w-md">
          <h2 id="remove-title" className="text-2xl font-bold">
            Remove {name(dialog.remove)}?
          </h2>
          <p className="text-gray-400 mt-2">
            Their cards go to the discard pile, they&apos;re skipped from now on, and they drop out of the standings.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" className={secondaryButton} onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={dangerButton}
              onClick={() => {
                act({ type: 'remove', playerId: dialog.remove });
                setDialog(null);
              }}
            >
              <Trash2 size={16} /> Remove
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
