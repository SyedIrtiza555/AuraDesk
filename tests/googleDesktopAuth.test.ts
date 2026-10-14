import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash } from 'node:crypto';

// Exercises the real desktop Google flow with the Tauri plugins, fetch and Firebase mocked.
const PORT = 49152;
const oauth = vi.hoisted(() => ({
  urlListener: null as ((url: string) => void) | null,
  start: vi.fn(),
  cancel: vi.fn(),
  unlisten: vi.fn(),
  openUrl: vi.fn(),
  signInWithCredential: vi.fn(),
  credential: vi.fn(),
}));

vi.mock('@fabianlars/tauri-plugin-oauth', () => ({
  start: oauth.start,
  cancel: oauth.cancel,
  onUrl: async (cb: (url: string) => void) => {
    oauth.urlListener = cb;
    return oauth.unlisten;
  },
}));
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: oauth.openUrl }));
vi.mock('../src/shared/firebase', () => ({ auth: { name: 'test-auth' } }));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: { credential: oauth.credential },
  signInWithCredential: oauth.signInWithCredential,
}));

const fetchMock = vi.fn();

async function load(clientId = 'desktop-client.apps.googleusercontent.com') {
  vi.resetModules();
  vi.stubEnv('VITE_GOOGLE_DESKTOP_CLIENT_ID', clientId);
  vi.stubEnv('VITE_GOOGLE_DESKTOP_CLIENT_SECRET', 'desktop-secret');
  return import('../src/features/auth/googleDesktopAuth');
}

// Starts sign-in and resolves once the browser would have been opened, with the auth URL.
async function begin(mod: Awaited<ReturnType<typeof load>>, signal = new AbortController().signal) {
  let opened!: (url: URL) => void;
  const authUrl = new Promise<URL>((resolve) => {
    opened = resolve;
  });
  oauth.openUrl.mockImplementation(async (url: string) => opened(new URL(url)));
  const result = mod.signInWithGoogleDesktop(signal);
  result.catch(() => {});
  return { result, authUrl: await authUrl };
}

beforeEach(() => {
  vi.clearAllMocks();
  oauth.urlListener = null;
  oauth.start.mockResolvedValue(PORT);
  oauth.cancel.mockResolvedValue(undefined);
  oauth.credential.mockImplementation((idToken: string, accessToken?: string) => ({ idToken, accessToken }));
  oauth.signInWithCredential.mockResolvedValue({ user: { uid: 'u1' } });
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ id_token: 'google-id-token', access_token: 'google-access-token' }),
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('signInWithGoogleDesktop', () => {
  it('runs the code + PKCE flow and signs in to Firebase with the ID token', async () => {
    const mod = await load();
    const { result, authUrl } = await begin(mod);

    const q = authUrl.searchParams;
    expect(authUrl.origin + authUrl.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(q.get('response_type')).toBe('code');
    expect(q.get('code_challenge_method')).toBe('S256');
    expect(q.get('redirect_uri')).toBe(`http://127.0.0.1:${PORT}`);
    expect(q.get('client_id')).toBe('desktop-client.apps.googleusercontent.com');
    const state = q.get('state')!;
    expect(state.length).toBeGreaterThan(16);

    // Wrong state or wrong port is ignored; the matching callback completes the flow.
    oauth.urlListener!(`http://127.0.0.1:${PORT}/?state=forged&code=evil`);
    oauth.urlListener!(`http://127.0.0.1:1/?state=${state}&code=evil`);
    oauth.urlListener!(`http://127.0.0.1:${PORT}/?state=${state}&code=auth-code&scope=openid`);

    await expect(result).resolves.toEqual({ user: { uid: 'u1' } });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchMock.mock.calls[0];
    expect(endpoint).toBe('https://oauth2.googleapis.com/token');
    const body = init.body as URLSearchParams;
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('auth-code');
    expect(body.get('redirect_uri')).toBe(`http://127.0.0.1:${PORT}`);
    expect(body.get('client_secret')).toBe('desktop-secret');
    const verifier = body.get('code_verifier')!;
    expect(createHash('sha256').update(verifier).digest('base64url')).toBe(q.get('code_challenge'));

    expect(oauth.credential).toHaveBeenCalledWith('google-id-token', 'google-access-token');
    expect(oauth.signInWithCredential).toHaveBeenCalledWith({ name: 'test-auth' }, {
      idToken: 'google-id-token',
      accessToken: 'google-access-token',
    });
    expect(oauth.cancel).toHaveBeenCalledWith(PORT);
    expect(oauth.unlisten).toHaveBeenCalled();
  });

  it('times out after two minutes and stops the loopback server', async () => {
    vi.useFakeTimers();
    const mod = await load();
    const { result } = await begin(mod);

    await vi.advanceTimersByTimeAsync(mod.GOOGLE_SIGN_IN_TIMEOUT_MS);

    await expect(result).rejects.toMatchObject({ code: 'timeout' });
    expect(oauth.cancel).toHaveBeenCalledWith(PORT);
    expect(oauth.signInWithCredential).not.toHaveBeenCalled();
  });

  it('stops when the user cancels', async () => {
    const mod = await load();
    const controller = new AbortController();
    const { result } = await begin(mod, controller.signal);

    controller.abort();

    await expect(result).rejects.toMatchObject({ code: 'cancelled' });
    expect(oauth.cancel).toHaveBeenCalledWith(PORT);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a denial in the browser', async () => {
    const mod = await load();
    const { result, authUrl } = await begin(mod);

    oauth.urlListener!(`http://127.0.0.1:${PORT}/?state=${authUrl.searchParams.get('state')}&error=access_denied`);

    await expect(result).rejects.toMatchObject({ code: 'denied' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a rejected token exchange', async () => {
    const mod = await load();
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'invalid_client', error_description: 'The OAuth client was not found.' }),
    });
    const { result, authUrl } = await begin(mod);

    oauth.urlListener!(`http://127.0.0.1:${PORT}/?state=${authUrl.searchParams.get('state')}&code=c`);

    await expect(result).rejects.toMatchObject({ code: 'token-exchange' });
    expect(oauth.signInWithCredential).not.toHaveBeenCalled();
    expect(oauth.cancel).toHaveBeenCalledWith(PORT);
  });

  it('refuses to start without a client ID', async () => {
    const mod = await load('');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(mod.signInWithGoogleDesktop(new AbortController().signal)).rejects.toMatchObject({
      code: 'not-configured',
    });
    expect(oauth.start).not.toHaveBeenCalled();
  });
});
