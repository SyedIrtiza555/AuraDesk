import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth';
import { auth } from '../../shared/firebase';
import { Button, Input, Field, Logo, LogoMark } from '../../shared/ui';
import {
  UserPlus,
  ArrowRight,
  Mail,
  KeyRound,
  UserRound,
  AlertCircle,
  MailCheck,
  Inbox,
  Gem,
  Send,
} from 'lucide-react';
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
  const [notice, setNotice] = useState<string | null>(null);
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
    <div className="h-full flex bg-canvas animate-fade-in">
      {/* Brand panel */}
      <aside className="hidden lg:flex relative w-[44%] max-w-[560px] bg-ink text-white flex-col justify-between p-12 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-aura/25 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 w-[460px] h-[460px] rounded-full bg-copper/25 blur-3xl" />

        <Logo inverse className="relative" />

        <div className="relative">
          <h1 className="font-display text-[44px] leading-[1.05]">
            Every piece, from <span className="italic text-aura">brief</span> to{' '}
            <span className="italic text-copper">brilliance</span>.
          </h1>
          <p className="mt-4 text-white/60 text-[15px] max-w-sm">
            The order desk for your jewelry design studio. Intake, CAD production, review and delivery in one place.
          </p>

          <div className="mt-10 space-y-3">
            {[
              { icon: Inbox, title: 'Capture the brief', text: 'Sales agents log every client request.' },
              { icon: Gem, title: 'Design with focus', text: 'Designers see exactly what is theirs to make.' },
              { icon: Send, title: 'Deliver with confidence', text: 'Verified WhatsApp hand-off, every time.' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/[0.07] ring-1 ring-white/10 flex items-center justify-center text-aura">
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-[13px] text-white/50">{text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/35">Aura Desk · Desktop workspace</p>
      </aside>

      {/* Form */}
      <main className="flex-1 flex items-center justify-center p-8 aura-backdrop lg:bg-none lg:bg-canvas overflow-y-auto">
        <div className="w-full max-w-[380px] animate-rise-in">
          <LogoMark className="lg:hidden w-11 h-11 mb-6" />
          <h2 className="font-display text-[32px] leading-tight text-ink">
            {isSignUp ? 'Join your studio' : 'Welcome back'}
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            {isSignUp
              ? 'Create an account. An owner will approve your role.'
              : 'Sign in to pick up where your team left off.'}
          </p>

          {error && (
            <div className="mt-5 flex gap-2.5 p-3.5 rounded-xl bg-rose-50 ring-1 ring-rose-200 text-rose-800 text-[13px] leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div className="mt-5 flex gap-2.5 p-3.5 rounded-xl bg-aura-soft ring-1 ring-aura text-ink text-[13px] leading-relaxed">
              <MailCheck className="w-4 h-4 shrink-0 mt-0.5 text-aura-deep" />
              <span>{notice}</span>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <Button variant="secondary" size="lg" onClick={handleGoogleSignIn} disabled={busy} loading={oauthLoading === 'google'}>
              {oauthLoading !== 'google' && <GoogleIcon />}
              Google
            </Button>
            <Button variant="primary" size="lg" onClick={handleAppleSignIn} disabled={busy} loading={oauthLoading === 'apple'}>
              {oauthLoading !== 'apple' && <AppleIcon />}
              Apple
            </Button>
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-line" />
            <span className="text-xs text-faint font-medium">or with email</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <Field label="Full name">
                <Input
                  required
                  autoComplete="name"
                  placeholder="Your full name"
                  icon={<UserRound />}
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
                icon={<Mail />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-ink-muted">Password</span>
                {!isSignUp && (
                  <button type="button" onClick={handleResetPassword} className="text-xs font-semibold text-copper-deep hover:underline">
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
                icon={<KeyRound />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" variant="aura" size="lg" className="w-full mt-2" loading={loading} disabled={busy}>
              {!loading && (isSignUp ? <UserPlus className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />)}
              {isSignUp ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {isSignUp ? 'Already have an account?' : 'New to the studio?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setNotice(null);
              }}
              className="font-semibold text-ink hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </div>
      </main>
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
