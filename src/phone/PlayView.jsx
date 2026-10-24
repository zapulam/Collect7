import { Hand, Heart, Plus, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Card from '../components/Card';
import { sortForDisplay } from '../lib/cards';
import EventFeed from '../components/EventFeed';
import Wordmark from '../components/Wordmark';
import { celebrate } from '../components/confetti';
import { useCountdown } from '../hooks/useCountdown';
import { useToast } from '../hooks/useToast';
import { STATUS_LABELS } from '../lib/describe';
import { handScore, numbersIn } from '../lib/scoring';
import CardTally from './CardTally';
import PhoneScores from './PhoneScores';
import TargetSheet from './TargetSheet';

const PENDING_TIMEOUT_MS = 5000;
const OUT = { cards: [], status: 'left', second: false };

function headline({ status, myTurn, myChoice, waitingOn, flip3Mine, phase, gate }) {
  if (phase !== 'playing') return { text: 'Round over', tone: 'text-gray-300' };
  if (flip3Mine) return { text: 'Flip Three! Taking three cards…', tone: 'text-orange-300' };
  if ((myTurn || myChoice) && gate > 0) return { text: 'Get ready…', tone: 'text-indigo-200' };
  if (myTurn) return { text: 'Your turn!', tone: 'text-white' };
  if (myChoice) return { text: 'Choose a player', tone: 'text-white' };
  if (status === 'bust') return { text: 'Bust!', tone: 'text-red-400' };
  if (status === 'frozen') return { text: 'Frozen. Points banked', tone: 'text-sky-300' };
  if (status === 'stayed') return { text: 'Stayed. Points banked', tone: 'text-emerald-300' };
  if (status === 'collected') return { text: 'Collect 7!', tone: 'text-amber-300' };
  if (waitingOn) return { text: `Waiting for ${waitingOn}…`, tone: 'text-gray-300' };
  return { text: 'Dealing…', tone: 'text-gray-300' };
}

export default function PlayView({ game, handle, hostOnline, offset }) {
  const meId = handle.playerId;
  const r = game.round;
  const hand = r?.hands[meId] ?? OUT;
  const pending = game.phase === 'playing' ? r?.pending : null;
  const myTurn = pending?.kind === 'turn' && pending.pid === meId;
  const myChoice = pending && pending.kind !== 'turn' && pending.pid === meId ? pending : null;
  const rawSeconds = useCountdown(pending ? r.deadline : null, offset);
  // The timer starts once the pause between turns is over, so it never reads above its length.
  const seconds = rawSeconds == null ? null : Math.min(rawSeconds, game.settings.turnSeconds);
  const gate = useCountdown(pending ? r.unlockAt : null, offset); // seconds until the pause is over
  const [toast, showToast] = useToast();
  const [sent, setSent] = useState(null); // { key, turnSeq }
  const busy = Boolean(sent && sent.turnSeq === r?.turnSeq);
  const name = useCallback((id) => game.players[id]?.name ?? 'Someone', [game.players]);

  // A request counts as done when the game moves on; if it doesn't, withdraw it.
  useEffect(() => {
    if (!busy) return;
    const id = setTimeout(() => {
      handle.cancelRequest(sent.key);
      setSent(null);
      showToast("That didn't go through. Try again.", 'bad');
    }, PENDING_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [busy, sent, handle, showToast]);

  // A buzz when it's your move.
  useEffect(() => {
    if (myTurn || myChoice) navigator.vibrate?.(40);
  }, [myTurn, myChoice, r?.turnSeq]);

  const onEvent = useCallback(
    (event) => {
      const aboutMe = event.pid === meId || event.target === meId;
      if (!aboutMe) return;
      if (event.type === 'bust' && event.pid === meId) navigator.vibrate?.([80, 50, 80]);
      if (event.type === 'collect' && event.pid === meId) celebrate();
    },
    [meId]
  );

  if (!r) return null;
  const send = (type, extra = {}) => {
    if (busy) return;
    const key = handle.sendRequest({ type, gameId: game.gameId, turnSeq: r.turnSeq, ...extra });
    setSent({ key, turnSeq: r.turnSeq });
  };

  const total = game.totals[meId] ?? 0;
  const live = hand.status === 'bust' ? 0 : handScore(hand.cards);
  const unique = new Set(numbersIn(hand.cards)).size;
  const cards = sortForDisplay(hand.cards);
  const lastIndex = hand.cards.length - 1;
  const flip3Mine = r.flip3?.pid === meId && game.phase === 'playing';
  const head = headline({
    status: hand.status,
    myTurn,
    myChoice,
    waitingOn: pending ? name(pending.pid) : null,
    flip3Mine,
    phase: game.phase,
    gate,
  });
  const locked = gate > 0;
  const canAct = myTurn && hostOnline && !busy && !locked;

  return (
    <main className="min-h-dvh text-gray-100 select-none [touch-action:manipulation] [-webkit-touch-callout:none]">
      <div className="mx-auto max-w-md">
        <div className="sticky top-0 z-20 bg-[#0b1020]/95 backdrop-blur-md border-b border-white/5 shadow-lg shadow-black/30">
          <header className="flex items-center justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2">
            <Wordmark className="text-xl" />
            <span className="text-sm text-gray-400">Round {r.n}</span>
            <span className="text-right leading-tight">
              <span className="block text-xl font-black tabular-nums" data-testid="my-total">
                {total}
              </span>
              <span className="block text-[10px] text-gray-500">of {game.settings.target}</span>
            </span>
          </header>

          {!hostOnline && (
            <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-red-500/15 border border-red-400/30 px-3 py-2 text-sm text-red-200">
              <WifiOff size={16} /> The big screen is offline. Taps are paused.
            </div>
          )}

          <section className="px-4 pb-3 grid gap-3" aria-label="Your cards">
            <div className="flex items-center justify-between gap-3">
              <h1 className={`text-2xl font-black ${head.tone}`} data-testid="headline">
                {head.text}
              </h1>
              {locked && (myTurn || myChoice) && <span className="text-2xl font-black tabular-nums text-indigo-200">{gate}</span>}
              {!locked && seconds != null && (myTurn || myChoice) && (
                <span className={`text-2xl font-black tabular-nums ${seconds <= 5 ? 'text-red-400' : 'text-indigo-200'}`}>{seconds}s</span>
              )}
            </div>
            <div className={`flex flex-wrap gap-2 min-h-[5.5rem] ${hand.status === 'bust' ? 'c7-shake' : ''}`} data-testid="my-cards">
              {cards.length ? (
                cards.map(({ card, i }) => (
                  <Card key={i} card={card} size="lg" bad={hand.status === 'bust' && i === lastIndex} />
                ))
              ) : (
                <p className="self-center text-gray-500">{hand.status === 'left' ? "You're not in this round." : 'No cards yet'}</p>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold">
                This round: <span className="tabular-nums text-lg font-black">{hand.status === 'bust' ? 0 : live}</span>
              </span>
              <span className="text-gray-400 tabular-nums">{unique}/7 numbers</span>
              {hand.second && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-rose-500/25 px-2 py-0.5 text-xs font-bold text-rose-100">
                  <Heart size={12} fill="currentColor" /> Second Chance
                </span>
              )}
              {!hand.second && hand.status !== 'active' && (
                <span className="ml-auto text-xs text-gray-400">{STATUS_LABELS[hand.status]}</span>
              )}
            </div>

            {hand.status === 'active' && game.phase === 'playing' ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={!canAct}
                  onClick={() => send('hit')}
                  className={`min-h-[64px] rounded-2xl text-2xl font-black text-white transition-all active:scale-[0.97] disabled:opacity-35 bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-lg shadow-fuchsia-950/50 inline-flex items-center justify-center gap-2 ${
                    canAct ? 'c7-glow [--glow:rgba(217,70,239,0.55)]' : ''
                  }`}
                  data-testid="hit"
                >
                  <Plus size={26} strokeWidth={3} /> Hit
                </button>
                <button
                  type="button"
                  disabled={!canAct}
                  onClick={() => send('stay')}
                  className="min-h-[64px] rounded-2xl text-2xl font-black text-white transition-all active:scale-[0.97] disabled:opacity-35 bg-emerald-600 shadow-lg shadow-emerald-950/50 inline-flex items-center justify-center gap-2"
                  data-testid="stay"
                >
                  <Hand size={24} /> Stay
                </button>
              </div>
            ) : (
              game.phase === 'playing' && (
                <p className="rounded-2xl bg-white/5 px-4 py-3 text-center text-sm text-gray-400">
                  You&apos;re out for this round. {hand.status === 'bust' ? 'Better luck next time!' : 'Your points are safe.'}
                </p>
              )
            )}
          </section>
        </div>

        <div className="px-4 pt-4 pb-[max(env(safe-area-inset-bottom),2rem)]">
          <CardTally game={game} hand={hand} />
        </div>
      </div>

      <EventFeed
        log={game.log}
        name={name}
        meId={meId}
        max={2}
        onEvent={onEvent}
        className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),1rem)] z-20 text-sm"
      />

      {myChoice && (
        <TargetSheet
          key={r.turnSeq}
          pending={myChoice}
          game={game}
          meId={meId}
          seconds={seconds}
          busy={busy}
          locked={locked}
          onChoose={(target) => send('choose', { target })}
        />
      )}
      {(game.phase === 'roundEnd' || game.phase === 'gameOver') && <PhoneScores game={game} meId={meId} />}

      {toast && (
        <div
          key={toast.id}
          className={`c7-toast fixed left-4 right-4 bottom-24 z-40 mx-auto max-w-md rounded-2xl px-4 py-3 text-center font-semibold shadow-xl ${
            toast.tone === 'bad' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-100'
          }`}
          role="status"
        >
          {toast.text}
        </div>
      )}
    </main>
  );
}
