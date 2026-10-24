import { useState } from 'react';
import { chipButton } from '../components/buttons';
import { DEFAULT_PACE, PACE_OPTIONS, TARGET_MAX, TARGET_MIN, TARGET_PRESETS, TIMER_OPTIONS } from '../lib/engine';

// Target score, turn timer and the pause between turns. The target can only change before the game starts.
export default function Settings({ settings, act, lockTarget = false }) {
  const isPreset = TARGET_PRESETS.includes(settings.target);
  const [custom, setCustom] = useState(isPreset ? '' : String(settings.target));
  const customValue = Number(custom);
  const customValid = Number.isInteger(customValue) && customValue >= TARGET_MIN && customValue <= TARGET_MAX;

  const applyCustom = () => {
    if (customValid && customValue !== settings.target) act({ type: 'settings', target: customValue });
  };

  return (
    <div className="grid gap-5">
      {!lockTarget && (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold text-gray-300 mb-2">Play to</legend>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Target score">
            {TARGET_PRESETS.map((target) => (
              <button
                key={target}
                type="button"
                aria-pressed={settings.target === target}
                className={chipButton(settings.target === target)}
                onClick={() => {
                  setCustom('');
                  act({ type: 'settings', target });
                }}
              >
                {target}
              </button>
            ))}
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                applyCustom();
              }}
            >
              <input
                inputMode="numeric"
                placeholder="Custom"
                aria-label="Custom target score"
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onBlur={applyCustom}
                className={`w-24 rounded-xl border px-3 py-2 text-sm bg-white/5 outline-none focus:border-indigo-400 ${
                  !isPreset && custom ? 'border-indigo-400 text-white' : 'border-white/10 text-gray-200'
                }`}
              />
            </form>
          </div>
          {custom && !customValid && (
            <p className="text-xs text-amber-300">
              Pick a number from {TARGET_MIN} to {TARGET_MAX}.
            </p>
          )}
        </fieldset>
      )}
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold text-gray-300 mb-2">Turn timer</legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Turn timer">
          {TIMER_OPTIONS.map((seconds) => (
            <button
              key={seconds}
              type="button"
              aria-pressed={settings.turnSeconds === seconds}
              className={chipButton(settings.turnSeconds === seconds)}
              onClick={() => act({ type: 'settings', turnSeconds: seconds })}
            >
              {seconds ? `${seconds}s` : 'Off'}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">When time runs out, the player automatically stays.</p>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold text-gray-300 mb-2">Pause between turns</legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Pause between turns">
          {PACE_OPTIONS.map((seconds) => (
            <button
              key={seconds}
              type="button"
              aria-pressed={(settings.pace ?? DEFAULT_PACE) === seconds}
              className={chipButton((settings.pace ?? DEFAULT_PACE) === seconds)}
              onClick={() => act({ type: 'settings', pace: seconds })}
            >
              {seconds}s
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">Each player&apos;s phone unlocks after this pause, so turns can&apos;t be rushed.</p>
      </fieldset>
    </div>
  );
}
