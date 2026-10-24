// Left margin for each card after the first in a row of small cards, so any number of them fit in
// `room` px. Cards sit side by side when there is space and overlap, each on top of the one
// before, when there isn't. `minStep` keeps enough of each card showing to read its number.
export function stackMargin(count, { cardWidth = 28, room = 140, gap = 3, minStep = 11 } = {}) {
  if (count <= 1) return 0;
  const fits = Math.floor((room - cardWidth) / (count - 1));
  const step = Math.max(minStep, Math.min(cardWidth + gap, fits));
  return step - cardWidth;
}
