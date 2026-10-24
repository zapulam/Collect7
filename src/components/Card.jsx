import { Heart, Layers, Snowflake } from 'lucide-react';
import { cardLabel, isAction, isNumber, NUMBER_COLORS } from '../lib/cards';

// `mod` is the modifier text size: "+10" needs more room than a number.
const SIZES = {
  xs: { box: 'w-7 h-10 rounded-md', text: 'text-sm', mod: 'text-[10px]', icon: 12, label: 'hidden' },
  sm: { box: 'w-10 h-14 rounded-lg', text: 'text-xl', mod: 'text-sm', icon: 16, label: 'hidden' },
  md: { box: 'w-14 h-20 rounded-xl', text: 'text-3xl', mod: 'text-xl', icon: 22, label: 'text-[8px]' },
  lg: { box: 'w-[3.9rem] h-[5.5rem] rounded-xl', text: 'text-4xl', mod: 'text-2xl', icon: 26, label: 'text-[9px]' },
  xl: { box: 'w-[5.25rem] h-[7.5rem] rounded-2xl', text: 'text-5xl', mod: 'text-3xl', icon: 34, label: 'text-[11px]' },
  '2xl': { box: 'w-[7.5rem] h-[10.5rem] rounded-3xl', text: 'text-7xl', mod: 'text-5xl', icon: 48, label: 'text-sm' },
};

const ACTION_STYLE = {
  freeze: { Icon: Snowflake, bg: 'linear-gradient(160deg,#7dd3fc,#0284c7)', short: 'FREEZE' },
  flip3: { Icon: Layers, bg: 'linear-gradient(160deg,#fdba74,#ea580c)', short: 'FLIP 3' },
  second: { Icon: Heart, bg: 'linear-gradient(160deg,#fda4af,#e11d48)', short: '2ND CHANCE' },
};

// The face-down side, shown for the first half of a flip.
function Back({ delay }) {
  return (
    <span
      className="c7-back absolute inset-0 z-10 grid place-items-center rounded-[inherit] bg-gradient-to-br from-indigo-600 to-fuchsia-700 pointer-events-none"
      style={{ animationDelay: `${delay}ms` }}
      aria-hidden="true"
    >
      <span className="absolute inset-[3px] rounded-[inherit] border border-white/35" />
      <span className="font-black text-white/80 text-[2.2em] leading-none">7</span>
    </span>
  );
}

// A face-up card. `bad` rings it in red (the duplicate that busted a hand). `flipDelay` (ms)
// makes it arrive face-down and turn over after that long, instead of the usual pop-in.
export default function Card({ card, size = 'md', bad = false, animate = true, flipDelay = null, className = '', style }) {
  const s = SIZES[size];
  const flipping = flipDelay != null;
  const ring = bad ? 'ring-4 ring-red-500 ring-offset-2 ring-offset-gray-900' : 'ring-1 ring-white/25';
  const motion = flipping ? 'c7-flip' : animate ? 'c7-deal' : '';
  // `style` is for layout (a margin, say); the flip's delay is added to it.
  const timing = { ...style, ...(flipping ? { animationDelay: `${flipDelay}ms` } : null) };
  const base = `relative shrink-0 select-none flex flex-col items-center justify-center font-black shadow-lg shadow-black/40 ${s.box} ${ring} ${motion} ${className}`;

  if (isNumber(card)) {
    return (
      <div className={`${base} text-white`} style={{ background: NUMBER_COLORS[Number(card)], ...timing }} aria-label={`Card ${card}`}>
        {flipping && <Back delay={flipDelay} />}
        <span className="absolute inset-[3px] rounded-[inherit] border border-white/30 pointer-events-none" />
        <span className={`${s.text} leading-none tabular-nums drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]`}>{card}</span>
      </div>
    );
  }
  if (isAction(card)) {
    const { Icon, bg, short } = ACTION_STYLE[card];
    return (
      <div className={`${base} text-white gap-1`} style={{ background: bg, ...timing }} aria-label={cardLabel(card)}>
        {flipping && <Back delay={flipDelay} />}
        <span className="absolute inset-[3px] rounded-[inherit] border border-white/35 pointer-events-none" />
        <Icon size={s.icon} strokeWidth={2.75} />
        <span className={`${s.label} font-extrabold tracking-tight leading-none text-center px-0.5`}>{short}</span>
      </div>
    );
  }
  // Modifiers: gold.
  return (
    <div
      className={`${base} text-amber-950`}
      style={{ background: 'linear-gradient(160deg,#fde68a,#f59e0b)', ...timing }}
      aria-label={`Modifier ${cardLabel(card)}`}
    >
      {flipping && <Back delay={flipDelay} />}
      <span className="absolute inset-[3px] rounded-[inherit] border border-amber-900/25 pointer-events-none" />
      <span className={`${s.mod} leading-none tabular-nums tracking-tight`}>{cardLabel(card)}</span>
    </div>
  );
}
