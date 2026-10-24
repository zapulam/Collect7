import { useMemo, useReducer } from 'react';
import { gameReducer } from '../lib/engine';
import { fromWire, publicView, toWire } from '../lib/wire';
import { PhoneRoom } from './PhoneApp';

// Development only: open /?preview to see and play the phone UI without a database.
// The real game engine runs right here in the page, standing in for the big screen, and
// the preview jumps between the states a phone goes through.
const GAME_ID = 'previewgame01';
const ME = { playerId: 'previewme001', clientId: 'previewcli001', name: 'You' };
const OTHERS = [
  { playerId: 'previewava01', clientId: 'previewcli002', name: 'Ava' },
  { playerId: 'previewben01', clientId: 'previewcli003', name: 'Ben' },
];

const SCENARIOS = {
  join: 'Join form',
  lobby: 'Lobby',
  turn: 'Your turn',
  waiting: 'Waiting',
  roundEnd: 'Round over',
  gameOver: 'Game over',
};

const run = (state, actions) => actions.reduce((s, action, i) => gameReducer(s, { now: 0, seed: i + 7, ...action }), state);
const joinAs = ({ playerId, clientId, name }) => ({ type: 'join', source: 'phone', gameId: GAME_ID, playerId, clientId, name });
const skip = (s) => run(s, [{ type: 'skip' }]);

function playUntil(state, done, limit = 1500) {
  let s = state;
  for (let i = 0; i < limit && !done(s); i++) {
    s = s.phase === 'roundEnd' ? run(s, [{ type: 'nextRound' }]) : skip(s);
  }
  return s;
}

function build(scenario) {
  const lobby = (players, target) =>
    run(null, [
      { type: 'create', gameId: GAME_ID, target, turnSeconds: 0 },
      ...players.map(joinAs),
    ]);
  const started = (target = 200) => run(lobby([ME, ...OTHERS], target), [{ type: 'start' }]);
  const myTurn = (s) => s.phase === 'playing' && s.round.pending?.pid === ME.playerId;

  switch (scenario) {
    case 'join':
      return lobby(OTHERS, 200);
    case 'lobby':
      return lobby([ME, ...OTHERS], 200);
    case 'turn':
      return playUntil(started(), (s) => myTurn(s) || s.phase !== 'playing');
    case 'waiting': {
      const mine = playUntil(started(), (s) => myTurn(s) || s.phase !== 'playing');
      const asked = mine.round?.pending;
      return asked?.kind === 'turn'
        ? run(mine, [{ type: 'stay', source: 'phone', gameId: GAME_ID, ...ME, turnSeq: mine.round.turnSeq }])
        : mine;
    }
    case 'roundEnd':
      return playUntil(started(), (s) => s.phase === 'roundEnd');
    default:
      return playUntil(started(25), (s) => s.phase === 'gameOver');
  }
}

export default function Preview() {
  const [state, dispatch] = useReducer(gameReducer, 'turn', build);
  const handle = useMemo(
    () => ({
      playerId: ME.playerId,
      clientId: ME.clientId,
      sendRequest: (request) => {
        dispatch({ ...request, source: 'phone', playerId: ME.playerId, clientId: ME.clientId, now: Date.now(), seed: Date.now() });
        return 'preview-request';
      },
      cancelRequest: () => {},
    }),
    []
  );
  // The phone only ever sees what the big screen publishes, so go through the same wire format.
  const game = useMemo(() => fromWire(toWire(publicView(state))), [state]);
  const go = (scenario) => dispatch({ type: 'restore', state: build(scenario) });
  const button = 'rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 text-xs font-semibold text-gray-100';

  return (
    <div className="min-h-dvh text-gray-100">
      <div className="sticky top-0 z-50 flex flex-wrap items-center gap-1.5 bg-gray-950/90 backdrop-blur px-3 py-2 border-b border-white/10">
        <span className="text-xs text-gray-400 mr-1">Preview</span>
        {Object.entries(SCENARIOS).map(([key, label]) => (
          <button key={key} type="button" className={button} onClick={() => go(key)}>
            {label}
          </button>
        ))}
        <button type="button" className={`${button} bg-indigo-500/40`} onClick={() => dispatch({ type: 'skip', now: Date.now(), seed: Date.now() })}>
          Skip decision
        </button>
        {state.phase === 'roundEnd' && (
          <button type="button" className={`${button} bg-indigo-500/40`} onClick={() => dispatch({ type: 'nextRound', now: Date.now(), seed: Date.now() })}>
            Next round
          </button>
        )}
      </div>
      <div className="mx-auto w-full max-w-md">
        <PhoneRoom game={game} handle={handle} hostOnline offset={0} />
      </div>
    </div>
  );
}
