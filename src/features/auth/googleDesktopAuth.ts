// Google sign-in for the Tauri desktop app.
//
// WebView2 cannot host Firebase's signInWithPopup, so we run the OAuth "installed app" flow:
// a loopback server on 127.0.0.1 (tauri-plugin-oauth), Google in the system browser,
// authorization code + PKCE, then the ID token is handed to Firebase with signInWithCredential.
// Setup (Desktop OAuth client, env vars) is documented in CLAUDE.md under "Google sign-in setup".
import { GoogleAuthProvider, signInWithCredential, type UserCredential } from 'firebase/auth';
import { start, cancel as stopServer, onUrl } from '@fabianlars/tauri-plugin-oauth';
import { openUrl } from '@tauri-apps/plugin-opener';
import { auth } from '../../shared/firebase';

const CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_DESKTOP_CLIENT_ID;
// Google issues a secret for Desktop clients and its token endpoint still asks for it, even with PKCE.
// It is not confidential for an installed app, but keep it out of git (.env.local / CI secret).
const CLIENT_SECRET: string | undefined = import.meta.env.VITE_GOOGLE_DESKTOP_CLIENT_SECRET;

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_SIGN_IN_TIMEOUT_MS = 2 * 60 * 1000;

// Shown in the browser tab after Google redirects back. The plugin injects a script into <head>
// that forwards the full URL to the app.
const CALLBACK_PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Aura Desk</title></head>
<body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:90vh;margin:0;color:#1C1D21">
<div style="text-align:center"><h2 style="font-weight:600">Return to Aura Desk</h2>
<p style="color:#6B7280">You can close this tab. Aura Desk will finish signing you in.</p></div></body></html>`;

export type GoogleDesktopAuthErrorCode =
  | 'not-configured'
  | 'cancelled'
  | 'timeout'
  | 'denied'
  | 'browser'
  | 'token-exchange';

// Messages are user-facing; AuthView shows them in the error banner (except 'cancelled').
export class GoogleDesktopAuthError extends Error {
  code: GoogleDesktopAuthErrorCode;

  constructor(code: GoogleDesktopAuthErrorCode, message: string) {
    super(message);
    this.name = 'GoogleDesktopAuthError';
    this.code = code;
  }
}

const RETRY_HINT = 'Try again, or sign in with your email and password.';

const cancelled = () => new GoogleDesktopAuthError('cancelled', 'Google sign-in was cancelled.');

const tokenExchangeFailed = (detail: string) =>
  new GoogleDesktopAuthError('token-exchange', `Google sign-in couldn't be completed (${detail}). ${RETRY_HINT}`);

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomToken(byteLength: number): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

// Resolves with `promise`, or rejects when the signal aborts or `ms` passes.
function untilCancelledOrTimeout<T>(promise: Promise<T>, signal: AbortSignal, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const settle = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      settle();
      reject(cancelled());
    };
    const timer = setTimeout(() => {
      settle();
      reject(
        new GoogleDesktopAuthError(
          'timeout',
          `Google sign-in timed out after ${Math.round(ms / 60000)} minutes. ${RETRY_HINT}`,
        ),
      );
    }, ms);
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        settle();
        resolve(value);
      },
      (err) => {
        settle();
        reject(err);
      },
    );
  });
}

interface TokenResponse {
  id_token?: string;
  access_token?: string;
  error?: string;
  error_description?: string;
}

/**
 * Signs in with Google through the system browser. Rejects with GoogleDesktopAuthError on
 * cancel (signal), timeout, denial or a failed exchange; Firebase errors pass through.
 * The loopback server is always stopped before this settles.
 */
export async function signInWithGoogleDesktop(signal: AbortSignal): Promise<UserCredential> {
  if (!CLIENT_ID) {
    console.error('[Google Desktop Auth] VITE_GOOGLE_DESKTOP_CLIENT_ID is not set for this build.');
    throw new GoogleDesktopAuthError(
      'not-configured',
      "Google sign-in isn't set up in this build yet. Sign in with your email and password for now.",
    );
  }

  const verifier = randomToken(32);
  const state = randomToken(16);
  const challenge = await pkceChallenge(verifier);

  const port = await start({ response: CALLBACK_PAGE });
  // The plugin listens on 127.0.0.1 only; Google accepts any port for Desktop clients.
  const redirectUri = `http://127.0.0.1:${port}`;
  let unlisten: (() => void) | undefined;

  try {
    let deliver!: (url: URL) => void;
    const callback = new Promise<URL>((resolve) => {
      deliver = resolve;
    });
    unlisten = await onUrl((raw) => {
      let url: URL;
      try {
        url = new URL(raw);
      } catch {
        return;
      }
      // Anything local can hit the loopback port, so only accept our own state.
      if (url.port === String(port) && url.searchParams.get('state') === state) deliver(url);
    });

    const authUrl = new URL(AUTH_ENDPOINT);
    authUrl.search = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      prompt: 'select_account',
    }).toString();

    if (signal.aborted) throw cancelled();
    try {
      await openUrl(authUrl.toString());
    } catch (err) {
      console.error('[Google Desktop Auth] Could not open the browser:', err);
      throw new GoogleDesktopAuthError('browser', `Couldn't open your web browser for Google sign-in. ${RETRY_HINT}`);
    }

    const result = await untilCancelledOrTimeout(callback, signal, GOOGLE_SIGN_IN_TIMEOUT_MS);

    const oauthError = result.searchParams.get('error');
    if (oauthError) {
      throw new GoogleDesktopAuthError(
        'denied',
        oauthError === 'access_denied'
          ? 'Google sign-in was cancelled in the browser.'
          : `Google couldn't sign you in (${oauthError}). ${RETRY_HINT}`,
      );
    }
    const code = result.searchParams.get('code');
    if (!code) throw tokenExchangeFailed('Google did not return an authorization code');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    });
    if (CLIENT_SECRET) body.set('client_secret', CLIENT_SECRET);

    let tokens: TokenResponse;
    let ok: boolean;
    try {
      const res = await fetch(TOKEN_ENDPOINT, { method: 'POST', body, signal });
      ok = res.ok;
      tokens = (await res.json()) as TokenResponse;
    } catch (err) {
      if (signal.aborted) throw cancelled();
      console.error('[Google Desktop Auth] Token request failed:', err);
      throw tokenExchangeFailed('could not reach Google');
    }
    if (!ok || !tokens.id_token) {
      console.error('[Google Desktop Auth] Token exchange rejected:', tokens.error, tokens.error_description);
      throw tokenExchangeFailed(tokens.error_description || tokens.error || 'no ID token returned');
    }

    if (signal.aborted) throw cancelled();
    return await signInWithCredential(auth, GoogleAuthProvider.credential(tokens.id_token, tokens.access_token));
  } finally {
    unlisten?.();
    stopServer(port).catch((err) => console.warn('[Google Desktop Auth] Could not stop loopback server:', err));
  }
}
