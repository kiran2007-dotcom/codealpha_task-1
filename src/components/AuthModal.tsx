import React, { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { Check, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { auth, googleProvider } from '../lib/firebase';
import { upsertUserProfile } from '../services/storeService';
import { validatePassword } from '../utils/formatters';

export function AuthModal() {
  const {
    isAuthModalOpen,
    authModalInitialMode,
    closeAuthModal,
    pushToast,
    refreshAdminState,
  } = useStore();

  const [mode, setMode] = useState<'login' | 'register'>(authModalInitialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [providerHelp, setProviderHelp] = useState(false);

  useEffect(() => {
    setMode(authModalInitialMode);
    setErrorMsg('');
    setProviderHelp(false);
  }, [authModalInitialMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const passwordCheck = validatePassword(password);

  const mapAuthError = (err: unknown): string => {
    const code = (err as { code?: string })?.code || '';
    if (code === 'auth/operation-not-allowed') {
      setProviderHelp(true);
      return 'Email/Password sign-in is not yet enabled in this Firebase project.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Incorrect email or password.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts. Please wait a moment before trying again.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in popup was closed before completing.';
    }
    return err instanceof Error ? err.message : 'Authentication failed.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setProviderHelp(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (mode === 'register') {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        setErrorMsg('Full name must be at least 2 characters.');
        return;
      }
      if (!passwordCheck.valid) {
        setErrorMsg('Please satisfy all password security requirements.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    } else if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        await updateProfile(cred.user, { displayName: name.trim() });
        await upsertUserProfile(cred.user, name.trim());
        sendEmailVerification(cred.user).catch(() => {});
        await refreshAdminState();
        pushToast('Account created. A verification email has been sent.', 'success');
      } else {
        const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        await upsertUserProfile(cred.user);
        await refreshAdminState();
        pushToast('Welcome back.', 'success');
      }
      closeAuthModal(true);
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setProviderHelp(false);
    setSubmitting(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await upsertUserProfile(cred.user);
      await refreshAdminState();
      pushToast('Signed in with Google.', 'success');
      closeAuthModal(true);
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={() => closeAuthModal(false)}
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-md glass-panel-strong rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
              Customer Account
            </p>
            <h2
              id="auth-modal-title"
              className="font-display text-2xl font-semibold text-zinc-900"
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => closeAuthModal(false)}
            aria-label="Close sign in dialog"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-white/70 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 bg-zinc-900/[0.06] rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === 'login' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
            className={`py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === 'register' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600'
            }`}
          >
            Register
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl border border-red-200/80 bg-red-50/85 backdrop-blur-sm text-xs text-red-800 leading-relaxed">
            <p className="font-medium">{errorMsg}</p>
            {providerHelp && (
              <p className="mt-1.5 text-red-700">
                To enable Email/Password login: open the Firebase Console &rarr; Authentication &rarr; Sign-in method &rarr; Enable &ldquo;Email/Password&rdquo;. You can also sign in immediately using Google below.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Mercer"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-zinc-900"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-zinc-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-zinc-900"
            />

            {mode === 'register' && (
              <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { ok: passwordCheck.checks.minLength, label: '8+ characters' },
                  { ok: passwordCheck.checks.hasUpper, label: '1 uppercase letter' },
                  { ok: passwordCheck.checks.hasLower, label: '1 lowercase letter' },
                  { ok: passwordCheck.checks.hasNumber, label: '1 number' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-1.5 ${
                      item.ok ? 'text-zinc-900 font-medium' : 'text-zinc-400'
                    }`}
                  >
                    <Check className="w-3 h-3 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-zinc-900"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 shadow-[0_10px_24px_-8px_rgba(24,24,27,0.45)] transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-900/10" />
          <span className="text-xs text-zinc-400 uppercase">or</span>
          <div className="h-px flex-1 bg-zinc-900/10" />
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={handleGoogleLogin}
          className="w-full py-2.5 rounded-xl glass-subtle text-zinc-900 text-sm font-medium hover:bg-white/90 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>
    </div>
  );
}
