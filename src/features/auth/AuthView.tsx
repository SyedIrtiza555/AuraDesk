import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../shared/firebase';
import { Button, Input } from '../../shared/ui';
import { LogIn, UserPlus } from 'lucide-react';
import type { UserProfile } from '../../shared/types';
import { useUIStore } from '../../shared/store';

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

export function AuthView() {
  const setCurrentUser = useUIStore((s) => s.setCurrentUser);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

        const nameParts = fullName.trim().split(' ');
        const initials =
          nameParts.map((p) => p[0]?.toUpperCase()).slice(0, 2).join('') || 'U';

        // 2. Check existing users in Firestore with a quick 5s timeout; fallback to owner if timeout/offline
        let isFirstUser = true;
        try {
          const usersSnap = await withTimeout(
            getDocs(collection(db, 'users')),
            5000,
            'Firestore check timed out'
          );
          isFirstUser = usersSnap.empty;
        } catch {
          // If Firestore is still initializing or offline, default first registrant to owner
          isFirstUser = true;
        }

        const newProfile: UserProfile = {
          uid: cred.user.uid,
          email: cred.user.email || email.trim(),
          displayName: fullName.trim() || 'Team Member',
          role: isFirstUser ? 'owner' : 'unassigned',
          status: isFirstUser ? 'active' : 'pending_approval',
          initials,
          createdAt: Date.now(),
        };

        // 3. Persist to Firestore (and local IndexedDB cache)
        try {
          await withTimeout(
            setDoc(doc(db, 'users', cred.user.uid), newProfile),
            5000,
            'Profile save timed out'
          );
        } catch (saveErr) {
          console.warn('[Aura Desk] Firestore profile saved to local offline cache:', saveErr);
        }

        setCurrentUser(newProfile);
      } else {
        // 1. Sign in with 12s timeout
        const cred = await withTimeout(
          signInWithEmailAndPassword(auth, email.trim(), password),
          12000,
          'Sign in request timed out. Please check your network or credentials.'
        );

        // 2. Fetch profile from Firestore with 5s timeout; use fallback if still syncing
        let profile: UserProfile | null = null;
        try {
          const snap = await withTimeout(
            getDoc(doc(db, 'users', cred.user.uid)),
            5000,
            'Profile read timed out'
          );
          if (snap.exists()) {
            profile = snap.data() as UserProfile;
          }
        } catch (fetchErr) {
          console.warn('[Aura Desk] Firestore profile read fallback:', fetchErr);
        }

        if (!profile) {
          profile = {
            uid: cred.user.uid,
            email: cred.user.email || email.trim(),
            displayName: cred.user.displayName || email.trim().split('@')[0],
            role: 'owner',
            status: 'active',
            createdAt: Date.now(),
          };
          try {
            await setDoc(doc(db, 'users', cred.user.uid), profile);
          } catch {
            // Ignored if offline
          }
        }

        setCurrentUser(profile);
      }
    } catch (err: unknown) {
      console.error('[Aura Desk Auth Error]:', err);
      let msg = 'Authentication failed';
      if (err instanceof Error) {
        msg = err.message;
        // Translate common Firebase codes into clear human messages
        if (msg.includes('auth/invalid-email')) {
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <div>
              <label className="block text-[11px] font-medium text-[#6B7280] mb-1">
                Full Name
              </label>
              <Input
                type="text"
                required
                placeholder="Shahrukh"
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
            <label className="block text-[11px] font-medium text-[#6B7280] mb-1">
              Password
            </label>
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
            disabled={loading}
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
