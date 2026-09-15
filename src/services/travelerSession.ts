import type { TravelerUser } from '../types/tourflow';

/**
 * Minimal traveler session holder (token + identity only — never passwords).
 *
 * Lives outside React/zustand so both the API client and the auth store share
 * one source of truth without an import cycle. The persisted snapshot in the
 * database remains the canonical trip store; localStorage only keeps the JWT
 * session needed to prove ownership to the backend.
 */

const STORAGE_KEY = 'wonderai_traveler_session';

export interface TravelerSession {
  token: string;
  user: TravelerUser;
}

type Listener = () => void;

const listeners = new Set<Listener>();

function readStored(): TravelerSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.token === 'string' && parsed.token && parsed?.user?.id) {
      return { token: parsed.token, user: parsed.user as TravelerUser };
    }
    return null;
  } catch {
    return null;
  }
}

let cached: TravelerSession | null | undefined;

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // never break callers because of a listener
    }
  });
}

export const travelerSession = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  get(): TravelerSession | null {
    if (cached === undefined) cached = readStored();
    return cached;
  },

  getToken(): string | null {
    return travelerSession.get()?.token || null;
  },

  set(session: TravelerSession): void {
    cached = session;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // private mode etc: in-memory session still works for this tab
    }
    notify();
  },

  clear(): void {
    cached = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage failures
    }
    notify();
  },
};
