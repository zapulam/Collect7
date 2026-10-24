import { useEffect, useState } from 'react';
import Wordmark from '../components/Wordmark';
import { primaryButton, secondaryButton } from '../components/buttons';
import { REJECTION_TEXT } from '../lib/describe';
import { cleanName, NAME_MAX } from '../lib/engine';
import { loadName, saveName } from '../lib/room';
import Screen from './Screen';

const NO_ANSWER_MS = 6000;

// Name entry. Also used in the lobby to change your name.
export default function JoinForm({ game, handle, me, onDone, onCancel }) {
  const [name, setName] = useState(() => me?.name ?? loadName());
  const [attempt, setAttempt] = useState(null); // { n, name, key } of the last request
  const [noAnswer, setNoAnswer] = useState(false);
  const rejection = game.rejections[handle.playerId];
  const fresh = attempt && rejection && rejection.n > attempt.n ? rejection : null;
  const accepted = attempt && me?.name === attempt.name;
  const waiting = attempt && !fresh && !accepted && !noAnswer;

  useEffect(() => {
    if (accepted) onDone();
  }, [accepted, onDone]);

  useEffect(() => {
    if (!waiting) return;
    const id = setTimeout(() => {
      handle.cancelRequest(attempt.key);
      setNoAnswer(true);
    }, NO_ANSWER_MS);
    return () => clearTimeout(id);
  }, [waiting, attempt, handle]);

  const submit = (e) => {
    e.preventDefault();
    const clean = cleanName(name);
    if (!clean) return;
    saveName(clean);
    setNoAnswer(false);
    const key = handle.sendRequest({ type: 'join', gameId: game.gameId, name: clean });
    setAttempt({ n: rejection?.n ?? 0, name: clean, key });
  };

  return (
    <Screen>
      <Wordmark className="text-5xl" />
      <form className="grid gap-4 w-full max-w-sm" onSubmit={submit}>
        <label className="grid gap-2 text-left">
          <span className="text-lg font-semibold">{me ? 'Change your name' : "What's your name?"}</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value.slice(0, NAME_MAX + 4));
              setAttempt(null);
            }}
            maxLength={NAME_MAX + 4}
            autoFocus
            autoComplete="nickname"
            enterKeyHint="go"
            placeholder="Your name"
            className="rounded-2xl bg-white/10 border border-white/15 px-4 py-4 text-xl outline-none focus:border-indigo-400 select-text"
            data-testid="name-input"
          />
        </label>
        {fresh && <p className="text-red-300 text-sm" role="alert">{REJECTION_TEXT[fresh.reason] ?? "Couldn't join."}</p>}
        {noAnswer && (
          <p className="text-amber-300 text-sm" role="alert">
            The big screen didn&apos;t answer. Is it still open? Try again.
          </p>
        )}
        <button type="submit" className={`${primaryButton} text-xl py-4`} disabled={!cleanName(name) || waiting}>
          {waiting ? 'Joining…' : me ? 'Save' : 'Join'}
        </button>
        {onCancel && (
          <button type="button" className={secondaryButton} onClick={onCancel}>
            Cancel
          </button>
        )}
      </form>
    </Screen>
  );
}
