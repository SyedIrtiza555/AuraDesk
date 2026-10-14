import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth';
import { auth } from '../../shared/firebase';
import { Button, Input } from '../../shared/ui';
import { LogIn, UserPlus } from 'lucide-react';
import { useUIStore } from '../../shared/store';
import { ensureUserProfile } from '../../shared/userProfile';
import { openUrl } from '@tauri-apps/plugin-opener';

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
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  // Show a forced sign-out notice once
  useEffect(() => {
    if (authNotice) setAuthNotice(null);
  }, [authNotice, setAuthNotice]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setOauthLoading('google');
    try {
      // In Tauri desktop environment, launch Google OAuth in default system browser
      let isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__);

      if (isTauri) {
        try {
          const { start, onUrl, cancel } = await import('@fabianlars/tauri-plugin-oauth');
          const port = await start({
            response: '<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:90vh;flex-direction:column;"><h2>Authentication Successful!</h2><p>You can return to Aura Desk now.</p><script>window.close();</script></body></html>',
          });

          // Listener for loopback callback
          onUrl(async (url) => {
            try {
              await cancel(port);
              const parsed = new URL(url);
              const idToken = parsed.searchParams.get('id_token') || new URLSearchParams(parsed.hash.replace('#', '?')).get('id_token');
              if (idToken) {
                const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth');
                const cred = GoogleAuthProvider.credential(idToken);
                await signInWithCredential(auth, cred);
              }
            } catch (err) {
              console.warn('[Loopback Auth Error]:', err);
            }
          });

          // Open Google OAuth consent in default browser
          const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=467381049765-m330p657s6j9v7q287k2gfa5q7k8u99u.apps.googleusercontent.com&redirect_uri=${encodeURIComponent(`http://localhost:${port}`)}&response_type=id_token&scope=openid%20email%20profile&nonce=${Date.now()}`;
          await openUrl(authUrl);
          return;
        } catch (tauriErr) {
          console.warn('[Tauri OAuth Fallback]:', tauriErr);
        }
      }

      // Standard Firebase popup fallback
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      console.error('[Google Sign-In Error]:', err);
      if (err instanceof Error) {
        if (err.message.includes('auth/popup-blocked') || err.message.includes('missing initial state')) {
          setError(
            'The desktop popup was blocked by Windows security. Please sign in below using your email and password, or click "Forgot or need to set password?" to set one in 1 click.'
          );
        } else if (!err.message.includes('auth/popup-closed-by-user')) {
          setError(err.message);
        }
      } else {
        setError('Google sign in failed');
      }
    } finally {
      setOauthLoading(null);
    }
  };

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
          setError(
            'The OAuth popup was blocked by Windows WebView2 security policies. In native desktop apps, Apple blocks embedded browser popups. Please sign in below using your email and password, or use the web workspace.'
          );
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

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col justify-center items-center p-6 relative overflow-hidden select-none">
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#CEE269]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-[#DA8F65]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm glass-floating rounded-3xl p-8 shadow-xl relative z-10 border border-white/80">
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#1C1D21] flex items-center justify-center text-white font-mono text-sm font-bold shadow-md mb-3">
            AD
          </div>
          <h1 className="text-xl font-semibold text-[#1C1D21] tracking-tight">
            Aura Desk
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5 text-center">
            {isSignUp ? 'Create new organization account' : 'Sign in to your agency workspace'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs leading-relaxed">
            {error}
          </div>
        )}

        {/* Social / SSO Auth Buttons */}
        <div className="space-y-2 mb-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || Boolean(oauthLoading)}
            className="w-full flex items-center justify-center gap-2.5 py-2 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[#1C1D21] text-xs font-semibold shadow-sm transition-all duration-150 disabled:opacity-50"
          >
            {oauthLoading === 'google' ? (
              <span className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={loading || Boolean(oauthLoading)}
            className="w-full flex items-center justify-center gap-2.5 py-2 px-3 rounded-xl border border-gray-900 bg-[#1C1D21] hover:bg-black text-white text-xs font-semibold shadow-sm transition-all duration-150 disabled:opacity-50"
          >
            {oauthLoading === 'apple' ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.4c.64-.81 1.09-1.94.97-3.07-1.03.04-2.27.69-2.98 1.52-.63.73-1.18 1.9-1.03 3.01 1.15.09 2.39-.62 3.04-1.46z" />
              </svg>
            )}
            <span>Continue with Apple</span>
          </button>
        </div>

        <div className="relative flex py-2 items-center mb-3">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-3 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            Or with email
          </span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <div>
              <label className="block text-[11px] font-medium text-[#6B7280] mb-1">
                Full Name
              </label>
              <Input
                type="text"
                required
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-[#6B7280] mb-1">
              Email Address
            </label>
            <Input
              type="email"
              required
              placeholder="name@agency.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium text-[#6B7280]">
                Password
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!email.trim()) {
                      setError('Please enter your email address above to receive a password reset link.');
                      return;
                    }
                    try {
                      setError(null);
                      const { sendPasswordResetEmail } = await import('firebase/auth');
                      await sendPasswordResetEmail(auth, email.trim());
                      setError('✓ Password setup/reset link sent to ' + email.trim() + '. Check your inbox to set your password.');
                    } catch (e: unknown) {
                      if (e instanceof Error) setError(e.message);
                    }
                  }}
                  className="text-[10px] text-blue-600 hover:underline font-medium"
                >
                  Forgot or need to set password?
                </button>
              )}
            </div>
            <Input
              type="password"
              required
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full py-2 text-xs font-semibold mt-1"
            disabled={loading || Boolean(oauthLoading)}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Connecting...
              </span>
            ) : isSignUp ? (
              <>
                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Register Account
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 mr-1.5" /> Sign In
              </>
            )}
          </Button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-xs text-[#1C1D21] hover:underline font-medium"
          >
            {isSignUp
              ? 'Already registered? Sign In'
              : 'New member? Create an account'}
          </button>
        </div>
      </div>
    </div>
  );
}
