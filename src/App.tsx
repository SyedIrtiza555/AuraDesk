import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from './shared/firebase';
import { useUIStore } from './shared/store';
import type { UserProfile } from './shared/types';
import { ensureUserProfile } from './shared/userProfile';
import { AuthView } from './features/auth/AuthView';
import { WaitingRoomView } from './features/auth/WaitingRoomView';
import { TeamGovernanceModal } from './features/team/TeamGovernanceModal';
import { OrderDashboard } from './features/orders/OrderDashboard';
import { UpdateNotifier } from './features/layout/UpdateNotifier';

export function App() {
  const currentUser = useUIStore((s) => s.currentUser);
  const setCurrentUser = useUIStore((s) => s.setCurrentUser);
  const setAuthNotice = useUIStore((s) => s.setAuthNotice);

  const [teamSnapshot, setTeamSnapshot] = useState<UserProfile[]>([]);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Firebase Auth state -> ensure profile doc -> live profile listener.
  // The Firestore doc is the only source of truth for role/status (it is what the rules enforce).
  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      if (!firebaseUser) {
        setCurrentUser(null);
        setIsAuthChecking(false);
        return;
      }

      setIsAuthChecking(true);
      let profileEnsured = false;
      try {
        await ensureUserProfile(firebaseUser);
        profileEnsured = true;
      } catch (e) {
        console.warn('[Aura Desk] Profile initialization error:', e);
      }

      unsubUserDoc = onSnapshot(
        doc(db, 'users', firebaseUser.uid),
        { includeMetadataChanges: true },
        (docSnap) => {
          if (docSnap.exists()) {
            setCurrentUser(docSnap.data() as UserProfile);
            setIsAuthChecking(false);
          } else if (!docSnap.metadata.fromCache) {
            // Server confirms there is no profile: removed by the owner, or it could not be created
            setAuthNotice(
              profileEnsured
                ? 'Your workspace access was removed by the owner. Sign in again to request access.'
                : 'Could not create your workspace profile. Check your connection and sign in again.'
            );
            setCurrentUser(null);
            setIsAuthChecking(false);
            signOut(auth).catch((e) => console.warn('[Aura Desk] Sign-out error:', e));
          }
        },
        (err) => {
          console.warn('[Aura Desk] Profile listener error:', err);
          setCurrentUser(null);
          setIsAuthChecking(false);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, [setCurrentUser, setAuthNotice]);

  // Team directory: only active members may read it (see firestore.rules)
  const canReadTeam =
    currentUser?.status === 'active' && currentUser.role !== 'unassigned';

  useEffect(() => {
    if (!canReadTeam) return;
    const unsubTeam = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((d) => list.push(d.data() as UserProfile));
        setTeamSnapshot(list);
      },
      (err) => console.warn('[Aura Desk] Team listener error:', err)
    );
    return () => unsubTeam();
  }, [canReadTeam]);
  const teamUsers = canReadTeam ? teamSnapshot : [];

  // 1. Initial Auth Check -> Dedicated branded loading screen (prevents flash of login screen)
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col justify-center items-center select-none relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#CEE269]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-[#1C1D21] flex items-center justify-center text-white font-mono text-xl font-bold shadow-xl mb-5 animate-pulse">
            AD
          </div>
          <h1 className="text-xl font-semibold text-[#1C1D21] tracking-tight">
            Aura Desk
          </h1>
          <div className="flex items-center gap-2 mt-3 text-xs text-[#6B7280]">
            <div className="w-3.5 h-3.5 border-2 border-[#1C1D21]/20 border-t-[#1C1D21] rounded-full animate-spin" />
            <span>Initializing workspace session...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated -> Show clean Auth View
  if (!currentUser) {
    return <AuthView />;
  }

  // 3. Unassigned, pending approval or suspended -> Locked to Waiting Room View
  if (currentUser.role === 'unassigned' || currentUser.status !== 'active') {
    return <WaitingRoomView />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1C1D21] flex flex-col font-sans select-none overflow-hidden">
      {/* Main Workspace with clean, minimal layout and zero visual bloat */}
      <main className="flex-1 flex overflow-hidden">
        <OrderDashboard teamUsers={teamUsers} />
      </main>

      {/* Team Governance Modal */}
      <TeamGovernanceModal teamUsers={teamUsers} />

      {/* Auto-Updater Available Notification & 1-Click Installer */}
      <UpdateNotifier />
    </div>
  );
}

export default App;
