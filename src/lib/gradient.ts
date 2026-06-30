/**
 * Deterministic on-brand gradient for media tiles that have no thumbnail.
 * Picking by a stable seed (e.g. the item id) keeps a given card's colour
 * consistent across renders while spreading variety across a list.
 */
const PAIRS: readonly (readonly [string, string])[] = [
  ['#5B8DEF', '#7A5AF8'], // blue → violet
  ['#7A5AF8', '#C77DFF'], // violet → orchid
  ['#166890', '#0A3653'], // teal → deep navy
  ['#F2A65A', '#EE6A8C'], // amber → rose
  ['#4A2B6B', '#2D2350'], // plum → indigo (matches the quote card)
  ['#38C793', '#166890'], // green → teal
];

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function gradientFor(seed: string): readonly [string, string] {
  return PAIRS[hash(seed) % PAIRS.length];
}
