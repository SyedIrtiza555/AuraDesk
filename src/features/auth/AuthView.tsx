import React, { useState, useEffect, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth';
import { auth } from '../../shared/firebase';
import { Button, Input, Field, Logo } from '../../shared/ui';
import { ArrowRight, AlertCircle, MailCheck } from 'lucide-react';
import { useUIStore } from '../../shared/store';
import { ensureUserProfile } from '../../shared/userProfile';
import { isTauri } from '@tauri-apps/api/core';
import { GoogleDesktopAuthError, signInWithGoogleDesktop } from './googleDesktopAuth';

const inDesktopApp = isTauri();

// Returns the banner text for a failed Google sign-in, or null when the user simply cancelled.
function googleErrorMessage(err: unknown): string | null {
  if (err instanceof GoogleDesktopAuthError) return err.code === 'cancelled' ? null : err.message;
  const code = (err as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null;
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Allow popups for this site and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'This email already has an Aura Desk account with a different sign-in method. Sign in with your email and password.';
    case 'auth/invalid-credential':
      // Most likely the Desktop OAuth client isn't trusted by Firebase (see CLAUDE.md, "Google sign-in setup").
      return 'Firebase rejected the Google sign-in. Ask the workspace owner to check the Google provider settings, or sign in with your email and password.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled for this workspace. Sign in with your email and password.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/network-request-failed':
      return 'Network error while signing in with Google. Check your connection and try again.';
  }
  return err instanceof Error ? err.message : 'Google sign-in failed.';
}

// Helper: Wrap a promise with a timeout so it never hangs indefinitely
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMsg: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMsg));
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Profiles (and roles) are created by App.tsx via ensureUserProfile on every auth state change;
// this view only authenticates.
export function AuthView() {
  const authNotice = useUIStore((s) => s.authNotice);
  const setAuthNotice = useUIStore((s) => s.setAuthNotice);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(authNotice);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  // Show a forced sign-out notice once
  useEffect(() => {
    if (authNotice) setAuthNotice(null);
  }, [authNotice, setAuthNotice]);

  // One AbortController per Google attempt. Cancelling (or leaving this view) stops the loopback
  // server; a stale attempt never touches the spinner or banner of a newer one.
  const googleAttempt = useRef<AbortController | null>(null);
  useEffect(() => () => googleAttempt.current?.abort(), []);

  const cancelGoogleSignIn = () => {
    googleAttempt.current?.abort();
    googleAttempt.current = null;
    setOauthLoading(null);
  };

  const handleGoogleSignIn = async () => {
    googleAttempt.current?.abort();
    const attempt = new AbortController();
    googleAttempt.current = attempt;
    setError(null);
    setOauthLoading('google');
    try {
      if (inDesktopApp) {
        // WebView2 can't host Firebase popups; use the system browser + loopback instead.
        await signInWithGoogleDesktop(attempt.signal);
      } else {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
      }
    } catch (err: unknown) {
      console.error('[Google Sign-In Error]:', err);
      if (googleAttempt.current === attempt) setError(googleErrorMessage(err));
    } finally {
      if (googleAttempt.current === attempt) {
        googleAttempt.current = null;
        setOauthLoading(null);
      }
    }
  };

  // Browser only. Apple only redirects to HTTPS return URLs on a verified domain, so the desktop
  // loopback used for Google can't work; the button is hidden in the desktop app.
  const handleAppleSignIn = async () => {
    setError(null);
    setOauthLoading('apple');
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      console.error('[Apple Sign-In Error]:', err);
      if (err instanceof Error) {
        if (err.message.includes('auth/popup-blocked')) {
          setError('Your browser blocked the Apple sign-in popup. Allow popups for this site and try again.');
        } else if (!err.message.includes('auth/popup-closed-by-user')) {
          setError(err.message);
        }
      } else {
        setError('Apple sign in failed');
      }
    } finally {
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // 1. Create user in Firebase Auth with 12s timeout
        const cred = await withTimeout(
          createUserWithEmailAndPassword(auth, email.trim(), password),
          12000,
          'Authentication request timed out. Please check your network and verify Firebase Auth is enabled in the Firebase console.'
        );

        // 2. Record the chosen name. New members start unassigned/pending; the owner email starts as owner.
        try {
          await ensureUserProfile(cred.user, fullName);
        } catch (saveErr) {
          console.warn('[Aura Desk] Profile setup warning:', saveErr);
        }
      } else {
        await withTimeout(
          signInWithEmailAndPassword(auth, email.trim(), password),
          12000,
          'Sign in request timed out. Please check your network or credentials.'
        );
      }
    } catch (err: unknown) {
      console.error('[Aura Desk Auth Error]:', err);
      let msg = 'Authentication failed';
      if (err instanceof Error) {
        msg = err.message;
        // Translate common Firebase codes into clear human messages
        if (msg.includes('auth/popup-blocked')) {
          msg = 'The OAuth popup was blocked by Windows security. In desktop applications, Google/Apple popups are restricted. Please sign in using your email and password below, or open the web workspace in your browser.';
        } else if (msg.includes('auth/invalid-email')) {
          msg = 'Invalid email address format (e.g. name@domain.com). Note: ".local" domains may be rejected by Firebase Auth; use a standard domain like @gmail.com or @auradesk.com.';
        } else if (msg.includes('auth/weak-password')) {
          msg = 'Password is too weak. Firebase requires at least 6 characters.';
        } else if (msg.includes('auth/user-not-found') || msg.includes('auth/invalid-credential')) {
          msg = 'Account not found or password incorrect. If this is your first time, click "New member? Create an account" below to register.';
        } else if (msg.includes('auth/email-already-in-use')) {
          msg = 'This email is already registered. Please sign in instead.';
        } else if (msg.includes('auth/config-not-found') || msg.includes('auth/operation-not-allowed')) {
          msg = 'Firebase Authentication is not enabled for this project yet. Please enable Email/Password provider in the Firebase Console.';
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setNotice(null);
    if (!email.trim()) {
      setError('Enter your email address above first, then we can send you a reset link.');
      return;
    }
    try {
      setError(null);
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email.trim());
      setNotice(`If an account exists for ${email.trim()}, a reset link is on its way. Check spam too.`);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
    }
  };

  const busy = loading || Boolean(oauthLoading);

  return (
    <div className="h-full overflow-y-auto bg-surface-muted animate-fade-in">
      <div className="min-h-full flex flex-col items-center justify-center p-6">
        <Logo className="mb-6" />

        <div className="w-full max-w-[360px] bg-surface border border-line rounded-xl shadow-card p-6 animate-rise-in">
          <h1 className="text-[17px] font-semibold text-ink">{isSignUp ? 'Create your account' : 'Sign in'}</h1>
          <p className="mt-1 text-[13px] text-muted">
            {isSignUp ? 'An owner approves your role after you sign up.' : 'Welcome back to your studio workspace.'}
          </p>

          {error && (
            <div className="mt-4 flex gap-2 p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs leading-relaxed">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div className="mt-4 flex gap-2 p-2.5 rounded-md bg-accent-soft border border-accent/20 text-ink text-xs leading-relaxed">
              <MailCheck className="w-3.5 h-3.5 shrink-0 mt-px text-accent" />
              <span>{notice}</span>
            </div>
          )}

          {/* Apple can't redirect to a desktop loopback, so the desktop app offers Google only */}
          <div className={inDesktopApp ? 'mt-5' : 'mt-5 grid grid-cols-2 gap-2'}>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={busy}
              loading={oauthLoading === 'google'}
            >
              {oauthLoading !== 'google' && <GoogleIcon />}
              {inDesktopApp ? 'Continue with Google' : 'Google'}
            </Button>
            {!inDesktopApp && (
              <Button variant="secondary" onClick={handleAppleSignIn} disabled={busy} loading={oauthLoading === 'apple'}>
                {oauthLoading !== 'apple' && <AppleIcon />}
                Apple
              </Button>
            )}
          </div>
          {inDesktopApp && oauthLoading === 'google' && (
            <p className="mt-2 text-xs text-muted text-center">
              Finish signing in with Google in your browser.{' '}
              <button type="button" onClick={cancelGoogleSignIn} className="text-accent hover:underline">
                Cancel
              </button>
            </p>
          )}

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-line" />
            <span className="text-[11px] text-faint">or</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <Field label="Full name">
                <Input
                  required
                  autoComplete="name"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </Field>
            )}

            <Field label="Email">
              <Input
                type="email"
                required
                autoComplete="email"
                placeholder="name@studio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-ink-muted">Password</span>
                {!isSignUp && (
                  <button type="button" onClick={handleResetPassword} className="text-xs text-accent hover:underline">
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                type="password"
                required
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" variant="accent" size="lg" className="w-full !mt-4" loading={loading} disabled={busy}>
              {isSignUp ? 'Create account' : 'Continue'}
              {!loading && <ArrowRight className="w-3.5 h-3.5" />}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-[13px] text-muted">
          {isSignUp ? 'Already have an account?' : 'New to the studio?'}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setNotice(null);
            }}
            className="font-medium text-accent hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.4c.64-.81 1.09-1.94.97-3.07-1.03.04-2.27.69-2.98 1.52-.63.73-1.18 1.9-1.03 3.01 1.15.09 2.39-.62 3.04-1.46z" />
    </svg>
  );
}
