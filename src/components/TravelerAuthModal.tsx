import React, { useState } from 'react';
import { X, Mail, Lock, User, Loader2, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { useTravelerAuth, TravelerAuthModalMode } from '../store/useTravelerAuth';

function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
}

export default function TravelerAuthModal() {
  const {
    isAuthModalOpen,
    authModalMode,
    authError,
    sessionExpired,
    closeAuthModal,
    openAuthModal,
    dismissSessionExpired,
    signup,
    login,
  } = useTravelerAuth();

  const [mode, setMode] = useState<TravelerAuthModalMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep local tab in sync when opened programmatically (e.g. session expiry).
  React.useEffect(() => {
    if (isAuthModalOpen) {
      setMode(authModalMode);
      setFieldError(null);
    }
  }, [isAuthModalOpen, authModalMode]);

  if (!isAuthModalOpen) return null;

  const switchMode = (next: TravelerAuthModalMode) => {
    setMode(next);
    setFieldError(null);
    openAuthModal(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const cleanEmail = email.trim();
    if (mode === 'signup' && !fullName.trim()) {
      setFieldError('Please enter your name.');
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setFieldError('Please enter a valid email address.');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setFieldError('Password must be at least 8 characters.');
      return;
    }
    if (mode === 'login' && !password) {
      setFieldError('Please enter your password.');
      return;
    }
    setFieldError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        await signup(fullName.trim(), cleanEmail, password);
      } else {
        await login(cleanEmail, password);
      }
      dismissSessionExpired();
      setPassword('');
    } catch {
      // authError in the store carries the server message; keep password for retry on login
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-stone-100">
          <button
            onClick={closeAuthModal}
            aria-label="Close"
            className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="text-stone-900">
              <svg className="w-6 h-6 fill-[#7065F0]" viewBox="0 0 24 24">
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-xl font-black text-stone-900">
                {mode === 'signup' ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                {mode === 'signup'
                  ? 'Save trips to your account and pick up anywhere.'
                  : 'Sign in to access your saved trips.'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-full">
            {(['login', 'signup'] as TravelerAuthModalMode[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => switchMode(tab)}
                className={`py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  mode === tab ? 'bg-white text-rose-600 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {tab === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {sessionExpired && mode === 'login' && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Session expired</p>
                <p className="text-amber-800">Please sign in again to keep your trips saved to your account.</p>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label htmlFor="traveler-auth-name" className="block text-xs font-bold text-stone-700 mb-1.5">
                Full name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="traveler-auth-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Aarav Sharma"
                  autoComplete="name"
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl pl-10 pr-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="traveler-auth-email" className="block text-xs font-bold text-stone-700 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="traveler-auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl pl-10 pr-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="traveler-auth-password" className="block text-xs font-bold text-stone-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="traveler-auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl pl-10 pr-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
          </div>

          {(fieldError || authError) && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="font-semibold">{fieldError || authError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-sm font-bold shadow-sm shadow-rose-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mode === 'signup' ? 'Creating account…' : 'Signing in…'}</span>
              </>
            ) : mode === 'signup' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-stone-500 text-center leading-relaxed">
            {mode === 'signup'
              ? 'Your trips stay saved to your account across devices and sessions.'
              : 'Anonymous trips keep working — sign in only when you want them saved.'}
          </p>
        </form>
      </div>
    </div>
  );
}
