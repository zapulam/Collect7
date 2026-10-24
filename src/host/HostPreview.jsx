import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { buildDeck } from '../lib/cards';
import { gameReducer } from '../lib/engine';
import { handScore, numbersIn } from '../lib/scoring';
import Board from './Board';

// Development only: open /?preview=host to watch the big screen with bot players, no
// database needed (add &flip3 to see a Flip Three right away). The bots tap through the real engine like phones do, so the pause
// between turns applies to them too.
const GAME_ID = 'previewhost01';
const BOTS = ['Ava', 'Ben', 'Cy', 'Dee', 'Eli'].map((name, i) => ({
  playerId: `previewbot${i}`,
  clientId: `previewbotclient${i}`,
  name,
}));
const RELAY = { status: 'live', online: new Set(BOTS.map((bot) => bot.playerId)), retry() {} };

function fresh() {
  let s = gameReducer(null, { type: 'create', gameId: GAME_ID, target: 100, turnSeconds: 0, pace: 3 });
  for (const bot of BOTS) s = gameReducer(s, { type: 'join', source: 'phone', gameId: GAME_ID, ...bot });
  // /?preview=host&flip3 stacks the deck so Ava's first Hit draws a Flip Three, followed by three numbers.
  const deck = new URLSearchParams(window.location.search).has('flip3')
    ? ['3', '5', '7', '8', '9', 'flip3', '1', '2', '4', ...buildDeck()]
    : undefined;
  return gameReducer(s, { type: 'start', deck, now: Date.now(), seed: Date.now() });
}

// A simple player: keeps hitting until it has a few numbers and a decent score.
function decide(round) {
  const { kind, pid, options } = round.pending;
  if (kind !== 'turn') return { type: 'choose', target: options[Math.floor(Math.random() * options.length)] };
  const cards = round.hands[pid].cards;
  const hit = new Set(numbersIn(cards)).size < 3 || handScore(cards) < 14 + Math.random() * 12;
  return { type: hit ? 'hit' : 'stay' };
}

export default function HostPreview() {
  const [state, dispatch] = useReducer(gameReducer, null, fresh);
  const [auto, setAuto] = useState(true);
  const act = useCallback((action) => dispatch({ ...action, now: Date.now(), seed: Date.now() }), []);

  const round = state.round;
  const pending = state.phase === 'playing' ? round.pending : null;

  // Bots wait for their phone to unlock, think for a moment, then tap.
  useEffect(() => {
    if (!auto || !pending) return;
    const wait = Math.max(0, round.unlockAt - Date.now()) + 600 + Math.random() * 1400;
    const id = setTimeout(() => {
      act({
        ...decide(round),
        source: 'phone',
        gameId: state.gameId,
        playerId: pending.pid,
        clientId: state.players[pending.pid].clientId,
        turnSeq: round.turnSeq,
      });
    }, wait);
    return () => clearTimeout(id);
  }, [auto, pending, round, state.gameId, state.players, act]);

  useEffect(() => {
    if (!auto || state.phase !== 'roundEnd') return;
    const id = setTimeout(() => act({ type: 'nextRound' }), 8000);
    return () => clearTimeout(id);
  }, [auto, state.phase, act]);

  const restart = useCallback(() => dispatch({ type: 'restore', state: fresh() }), []);
  const relay = useMemo(() => RELAY, []);
  const button = 'rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 text-xs font-semibold text-gray-100';

  return (
    <>
      <Board roomId="PREVIEW" state={state} relay={relay} act={act} offset={0} onNewGame={restart} />
      <div className="fixed bottom-2 right-2 z-50 flex items-center gap-1.5 rounded-full bg-gray-950/90 border border-white/10 px-2 py-1">
        <span className="text-xs text-gray-400 pl-1">Preview</span>
        <button type="button" className={button} onClick={() => setAuto((on) => !on)}>
          Bots: {auto ? 'on' : 'off'}
        </button>
        <button type="button" className={button} onClick={restart}>
          Restart
        </button>
      </div>
    </>
  );
}
