// canvas-confetti is only downloaded the first time something is worth celebrating.
let loader = null;

export function celebrate(options = {}) {
  loader ??= import('canvas-confetti').then((m) => m.default);
  loader
    .then((confetti) =>
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, disableForReducedMotion: true, ...options })
    )
    .catch(() => {});
}
