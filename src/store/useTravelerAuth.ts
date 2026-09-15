import { create } from 'zustand';
import { TourFlowApi } from '../services/api';
import { travelerSession } from '../services/travelerSession';
import type { TravelerUser } from '../types/tourflow';

export type TravelerAuthStatus = 'idle' | 'restoring' | 'authenticated' | 'anonymous';
export type TravelerAuthModalMode = 'login' | 'signup';

interface TravelerAuthState {
  user: TravelerUser | null;
  status: TravelerAuthStatus;
  authError: string | null;
  isAuthModalOpen: boolean;
  authModalMode: TravelerAuthModalMode;
  sessionExpired: boolean;

  boot: () => Promise<void>;
  signup: (fullName: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  handleUnauthorized: () => void;
  openAuthModal: (mode?: TravelerAuthModalMode) => void;
  closeAuthModal: () => void;
  dismissSessionExpired: () => void;
  syncFromSession: () => void;
}

export const useTravelerAuth = create<TravelerAuthState>((set, get) => ({
  user: travelerSession.get()?.user || null,
  status: travelerSession.get() ? 'restoring' : 'anonymous',
  authError: null,
  isAuthModalOpen: false,
  authModalMode: 'login',
  sessionExpired: false,

  syncFromSession: () => {
    const session = travelerSession.get();
    set(session ? { user: session.user, status: 'authenticated' } : { user: null, status: 'anonymous' });
  },

  boot: async () => {
    const session = travelerSession.get();
    if (!session) {
      set({ user: null, status: 'anonymous' });
      return;
    }
    set({ status: 'restoring' });
    try {
      const me = await TourFlowApi.getTravelerMe();
      travelerSession.set({ token: session.token, user: me });
      set({ user: me, status: 'authenticated', sessionExpired: false });
    } catch {
      // Invalid/expired token, or backend unreachable without a session proof:
      // only clear when the backend explicitly rejects the session (401).
      // Network failures keep the stored session for the next retry.
      if ((TourFlowApi.lastAuthStatus || 0) === 401) {
        travelerSession.clear();
        set({ user: null, status: 'anonymous', sessionExpired: true });
      } else {
        set({ user: session.user, status: 'authenticated' });
      }
    }
  },

  signup: async (fullName, email, password) => {
    set({ authError: null });
    try {
      const res = await TourFlowApi.travelerSignup(fullName, email, password);
      travelerSession.set({ token: res.token, user: res.user });
      set({ user: res.user, status: 'authenticated', isAuthModalOpen: false, sessionExpired: false });
    } catch (err: any) {
      set({ authError: err?.message || 'Signup failed. Please try again.' });
      throw err;
    }
  },

  login: async (email, password) => {
    set({ authError: null });
    try {
      const res = await TourFlowApi.travelerLogin(email, password);
      travelerSession.set({ token: res.token, user: res.user });
      set({ user: res.user, status: 'authenticated', isAuthModalOpen: false, sessionExpired: false });
    } catch (err: any) {
      set({ authError: err?.message || 'Login failed. Please try again.' });
      throw err;
    }
  },

  logout: () => {
    travelerSession.clear();
    set({ user: null, status: 'anonymous', sessionExpired: false, authError: null });
  },

  handleUnauthorized: () => {
    // Called when a traveler-scoped API answers 401: the session is no
    // longer valid server-side, so drop it and invite a fresh sign-in.
    if (!get().user && get().status === 'anonymous') return;
    travelerSession.clear();
    set({ user: null, status: 'anonymous', sessionExpired: true, isAuthModalOpen: true, authModalMode: 'login' });
  },

  openAuthModal: (mode = 'login') => {
    set({ isAuthModalOpen: true, authModalMode: mode, authError: null });
  },

  closeAuthModal: () => {
    set({ isAuthModalOpen: false, authError: null });
  },

  dismissSessionExpired: () => {
    set({ sessionExpired: false });
  },
}));

// Route traveler-API 401s back into the store (api.ts never imports the
// store, so there is no import cycle).
TourFlowApi.onUnauthorized = () => {
  useTravelerAuth.getState().handleUnauthorized();
};
travelerSession.subscribe(() => {
  const session = travelerSession.get();
  const current = useTravelerAuth.getState();
  if (!session && current.user) {
    useTravelerAuth.setState({ user: null, status: 'anonymous' });
  } else if (session && !current.user) {
    useTravelerAuth.setState({ user: session.user, status: 'authenticated' });
  }
});
