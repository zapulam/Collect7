import { useEffect, useState } from 'react';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// One wheel. It starts at 0 and rolls to its digit, so a score counts up the first time it appears.
function Wheel({ digit, duration }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(digit));
    return () => cancelAnimationFrame(id);
  }, [digit]);
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden" aria-hidden="true">
      <span
        className="absolute inset-x-0 top-0 flex flex-col transition-transform ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
        style={{ transform: `translateY(-${shown}em)`, transitionDuration: `${duration}ms` }}
      >
        {DIGITS.map((n) => (
          <span key={n} className="block h-[1em] text-center leading-[1em]">
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

// A number that rolls like an old mechanical counter whenever its value changes.
export default function Odometer({ value, duration = 900, className = '' }) {
  const digits = String(Math.max(0, Math.trunc(value))).split('').map(Number);
  return (
    <span className={`inline-flex items-center leading-none tabular-nums ${className}`} role="img" aria-label={String(value)}>
      {digits.map((digit, i) => (
        // Keyed from the right, so the ones wheel stays the ones wheel when a digit is added.
        <Wheel key={digits.length - 1 - i} digit={digit} duration={duration} />
      ))}
    </span>
  );
}
