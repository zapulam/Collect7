import { copiesOf, NUMBER_COLORS, NUMBERS } from '../lib/cards';
import { bustChance, numbersIn } from '../lib/scoring';

// For each number: how many are face-up on the table this round, and how many are still in
// the draw pile. The rest are in the discard pile. Numbers you hold are flagged.
export default function CardTally({ game, hand }) {
  const r = game.round;
  const onTable = NUMBERS.map(() => 0);
  for (const h of Object.values(r?.hands ?? {})) {
    for (const n of numbersIn(h.cards)) onTable[n] += 1;
  }
  const mine = new Set(numbersIn(hand.cards));
  const { count, left } = game.deck;
  const numbersLeft = left.reduce((a, b) => a + b, 0);
  const chance = bustChance(hand.cards, left, count);
  const canHit = hand.status === 'active' && game.phase === 'playing';

  return (
    <section className="grid gap-3" aria-labelledby="tally-title" data-testid="card-tally">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="tally-title" className="text-lg font-bold">
            Cards in play
          </h2>
          <p className="text-xs text-gray-400">
            {count} left in the deck · {count - numbersLeft} of them modifiers or actions
          </p>
        </div>
        {canHit && (
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-gray-400">Bust chance</div>
            <div
              className={`text-2xl font-black tabular-nums ${chance >= 0.35 ? 'text-red-400' : chance >= 0.2 ? 'text-amber-300' : 'text-emerald-300'}`}
              data-testid="bust-chance"
            >
              {hand.second ? '0%' : `${Math.round(chance * 100)}%`}
            </div>
            {hand.second && <div className="text-[11px] text-rose-200">Second Chance</div>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-[11px] text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-gray-300" /> on the table
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-gray-300" /> still in deck
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-white/10" /> discarded
        </span>
      </div>

      <ol className="grid gap-1.5">
        {[...NUMBERS].reverse().map((n) => {
          const total = copiesOf(String(n));
          const table = onTable[n];
          const inDeck = left[n];
          const held = mine.has(n);
          return (
            <li
              key={n}
              className={`grid grid-cols-[2.25rem_1fr_5.5rem] items-center gap-2.5 rounded-lg px-1.5 py-1 ${held ? 'bg-red-500/15 ring-1 ring-red-400/50' : ''}`}
            >
              <span
                className="flex h-7 w-9 items-center justify-center rounded-md text-sm font-black text-white tabular-nums"
                style={{ background: NUMBER_COLORS[n] }}
              >
                {n}
              </span>
              <span className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}>
                {Array.from({ length: total }, (_, i) => {
                  const kind = i < table ? 'table' : i < table + inDeck ? 'deck' : 'gone';
                  return (
                    <span
                      key={i}
                      className={`h-3.5 rounded-[3px] ${kind === 'gone' ? 'bg-white/10' : kind === 'deck' ? 'border-[1.5px]' : ''}`}
                      style={
                        kind === 'table'
                          ? { background: NUMBER_COLORS[n] }
                          : kind === 'deck'
                            ? { borderColor: NUMBER_COLORS[n], background: `${NUMBER_COLORS[n]}22` }
                            : undefined
                      }
                    />
                  );
                })}
              </span>
              <span className="text-right text-xs tabular-nums text-gray-300">
                {held ? <span className="font-bold text-red-300">yours · </span> : null}
                <span className="font-semibold text-white">{inDeck}</span> left
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
