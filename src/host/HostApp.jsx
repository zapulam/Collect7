import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useHostRelay } from '../hooks/useHostRelay';
import { useTurnTimeout } from '../hooks/useTurnTimeout';
import { useWakeLock } from '../hooks/useWakeLock';
import { DEFAULT_PACE, DEFAULT_TARGET, gameReducer } from '../lib/engine';
import { relayConfigured } from '../lib/firebaseConfig';
import { generateRoomId, loadHostSession, randomId, randomSeed, saveHostSession } from '../lib/room';
import { publicView } from '../lib/wire';
import Board from './Board';
import Lobby from './Lobby';
import StartScreen from './StartScreen';

// The big screen: owns the game, mirrors it to the room, and runs the phones' requests
// through the reducer.
// A game saved within this long comes straight back after a refresh or a closed tab.
const RESUME_WINDOW_MS = 6 * 60 * 60 * 1000;

function recentGame(saved) {
  return saved && saved.state.phase !== 'gameOver' && Date.now() - saved.savedAt < RESUME_WINDOW_MS ? saved : null;
}

export default function HostApp() {
  const [saved] = useState(loadHostSession);
  const [roomId, setRoomId] = useState(() => recentGame(saved)?.roomId ?? null);
  const [state, dispatch] = useReducer(gameReducer, null, () => recentGame(saved)?.state ?? null);
  const offset = useRef(0);
  const [clockOffset, setClockOffset] = useState(0);

  // Every action is stamped with server time (for timers) and a seed (for shuffles), so
  // the reducer stays pure.
  const act = useCallback(
    (action) => dispatch({ ...action, now: Date.now() + offset.current, seed: randomSeed() }),
    []
  );
  const onOffset = useCallback((value) => {
    offset.current = value;
    setClockOffset(value);
  }, []);

  const view = useMemo(() => publicView(state), [state]);
  const relay = useHostRelay({ roomId: relayConfigured ? roomId : null, view, onAction: act, onOffset });
  useTurnTimeout(state?.round, state?.phase, act, clockOffset);
  useWakeLock(Boolean(roomId));

  useEffect(() => {
    if (roomId && state) saveHostSession({ roomId, state });
  }, [roomId, state]);

  const startNew = useCallback(
    (settings = {}) => {
      dispatch({
        type: 'create',
        gameId: randomId(),
        target: settings.target ?? state?.settings.target ?? DEFAULT_TARGET,
        turnSeconds: settings.turnSeconds ?? state?.settings.turnSeconds ?? 0,
        pace: settings.pace ?? state?.settings.pace ?? DEFAULT_PACE,
      });
      setRoomId(generateRoomId());
    },
    [state]
  );

  const resume = useCallback(() => {
    dispatch({ type: 'restore', state: saved.state });
    setRoomId(saved.roomId);
  }, [saved]);

  const leave = useCallback(() => {
    saveHostSession(null);
    setRoomId(null);
  }, []);

  if (!roomId || !state) {
    return <StartScreen configured={relayConfigured} saved={saved} onStart={() => startNew()} onResume={resume} />;
  }
  if (state.phase === 'lobby') {
    return <Lobby roomId={roomId} state={state} relay={relay} act={act} onNewGame={leave} />;
  }
  return <Board roomId={roomId} state={state} relay={relay} act={act} offset={clockOffset} onNewGame={leave} />;
}
