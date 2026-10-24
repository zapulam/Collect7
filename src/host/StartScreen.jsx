import { Play, RotateCcw } from 'lucide-react';
import Card from '../components/Card';
import Wordmark from '../components/Wordmark';
import { primaryButton, secondaryButton } from '../components/buttons';

const PREVIEW = ['7', '12', 'x2', 'freeze', '3'];

export default function StartScreen({ configured, saved, onStart, onResume }) {
  const savedRound = saved?.state?.round?.n;
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-10 px-6 py-10 text-gray-100">
      <div className="flex gap-3 [&>*:nth-child(odd)]:-rotate-6 [&>*:nth-child(even)]:rotate-6" aria-hidden="true">
        {PREVIEW.map((card) => (
          <Card key={card} card={card} size="lg" />
        ))}
      </div>
      <div className="text-center grid gap-3">
        <h1>
          <Wordmark className="text-6xl md:text-7xl" />
        </h1>
        <p className="text-lg text-gray-300 max-w-xl">
          Push your luck: collect seven different numbers without drawing a duplicate. This screen is the table,
          and everyone plays from their phone.
        </p>
      </div>

      {configured ? (
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <button type="button" className={`${primaryButton} text-lg px-10 py-4`} onClick={onStart}>
            <Play size={20} /> Start a new game
          </button>
          {saved && (
            <button type="button" className={secondaryButton} onClick={onResume}>
              <RotateCcw size={18} /> Resume room <span className="font-mono tracking-widest">{saved.roomId}</span>
              {savedRound ? <span className="text-gray-400">· round {savedRound}</span> : null}
            </button>
          )}
        </div>
      ) : (
        <div className="max-w-lg rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5 text-amber-100 text-center">
          <p className="font-semibold">Firebase isn&apos;t set up yet.</p>
          <p className="text-sm mt-1 text-amber-100/80">
            Phones connect through a Firebase Realtime Database. Add your project id and database URL to{' '}
            <code className="font-mono">src/lib/firebaseConfig.js</code> (see the README).
          </p>
        </div>
      )}
    </main>
  );
}
