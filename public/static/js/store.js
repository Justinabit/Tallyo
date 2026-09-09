// =============================================================================
// TALLYO — Tiny central app state
// =============================================================================
// Holds the current user, active period selection, and currently-loaded
// reference data (categories/wallets) that many pages need. Not a full
// framework — just a plain object + subscriber list, kept intentionally
// simple per the project's "beginner-friendly code" requirement.
// =============================================================================

import { todayISO } from './utils/dates.js';

const state = {
  user: null,
  profile: null,
  preferences: null,
  categories: [],
  wallets: [],
  period: {
    type: 'monthly', // weekly | monthly | yearly | custom
    offset: 0,
    customRange: null // { start, end }
  },
  refDate: todayISO()
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setPeriod(patch) {
  state.period = { ...state.period, ...patch };
  listeners.forEach((fn) => fn(state));
}
