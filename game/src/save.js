// Best cash and the saved game, in localStorage. Every access is guarded: storage can be
// off (private windows), and then the numbers last this visit only.
import { BEST_KEY, SAVE_KEY } from './config.js';

function read(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage off: ignore.
  }
}

export function loadBest() {
  return Number.parseInt(read(BEST_KEY) ?? '0', 10) || 0;
}

export function saveBest(value) {
  write(BEST_KEY, String(value));
}

/** The saved game: cash, mission, position and stats, or null when there is none. */
export function loadSave() {
  try {
    const raw = read(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (typeof save.cash !== 'number' || typeof save.mission !== 'number') return null;
    return save;
  } catch {
    return null;
  }
}

export function saveSave(save) {
  write(SAVE_KEY, JSON.stringify(save));
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage off: ignore.
  }
}
