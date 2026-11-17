// Best cash and three save slots, in localStorage. Every access is guarded: storage
// can be off (private windows), and then the numbers last this visit only. A save
// holds Sugeng's cash, mission, position, stats, upgrades and the current weapon.
import { BEST_KEY, SAVE_KEYS } from './config.js';

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

function parseSave(raw) {
  if (!raw) return null;
  try {
    const save = JSON.parse(raw);
    if (typeof save.cash !== 'number' || typeof save.mission !== 'number') return null;
    return save;
  } catch {
    return null;
  }
}

/** The save in slot `slot` (1-3), or null when the slot is empty. */
export function loadSave(slot) {
  return parseSave(read(SAVE_KEYS[(slot ?? 1) - 1] ?? SAVE_KEYS[0]));
}

/** All three slots, in order; empty slots are null. */
export function listSaves() {
  return SAVE_KEYS.map((key) => parseSave(read(key)));
}

export function saveSave(slot, save) {
  write(SAVE_KEYS[(slot ?? 1) - 1] ?? SAVE_KEYS[0], JSON.stringify(save));
}

export function clearSave(slot) {
  try {
    window.localStorage.removeItem(SAVE_KEYS[(slot ?? 1) - 1] ?? SAVE_KEYS[0]);
  } catch {
    // Storage off: ignore.
  }
}
