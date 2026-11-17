// A small seeded random number generator (mulberry32): the same seed gives the same
// Wilwatikta, the same traffic and the same screenshot scenes, which is what makes
// ?shot= repeatable. Helpers cover the draws the world builder needs; randBool takes a
// probability so placement odds read as plain numbers at the call site.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [min, max). */
export function randRange(rng, min, max) {
  return min + rng() * (max - min);
}

/** An integer in [min, max]. */
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** One element of an array, uniformly. */
export function pick(rng, array) {
  return array[Math.floor(rng() * array.length)];
}

/** True with probability `p`. */
export function randBool(rng, p) {
  return rng() < p;
}
