import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from './shared/firebase';
import { useUIStore } from './shared/store';
import type { UserProfile } from './shared/types';
import { AuthView } from './features/auth/AuthView';
import { WaitingRoomView } from './features/auth/WaitingRoomView';
import { TeamGovernanceModal } from './features/team/TeamGovernanceModal';
import { OrderDashboard } from './features/orders/OrderDashboard';
import { UpdateNotifier } from './features/layout/UpdateNotifier';

const isOwnerEmail = (email?: string | null) => {
  const norm = (email || '').toLowerCase().trim();
  return norm === 's.irtizahussain@gmail.com' || norm.includes('shahrukh');
};

export function App() {
  const currentUser = useUIStore((s) => s.currentUser);
  const setCurrentUser = useUIStore((s) => s.setCurrentUser);

  const [teamUsers, setTeamUsers] = useState<UserProfile[]>([]);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Sync authentic Firebase Auth state & Real-Time Profile Listener
  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userDocRef);
          const isOwner = isOwnerEmail(firebaseUser.email);

          if (!snap.exists()) {
            const initialRole = isOwner ? 'owner' : 'unassigned';
            const initialStatus = initialRole === 'owner' ? 'active' : 'pending_approval';
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Team Member',
              role: initialRole,
              status: initialStatus,
              initials: (firebaseUser.displayName || firebaseUser.email || 'TM').slice(0, 2).toUpperCase(),
              createdAt: Date.now(),
            };
            await setDoc(userDocRef, fallbackProfile);
            setCurrentUser(fallbackProfile);
          } else {
            const existing = snap.data() as UserProfile;
            if (isOwner && (existing.role !== 'owner' || existing.status !== 'active')) {
              await updateDoc(userDocRef, { role: 'owner', status: 'active' });
              setCurrentUser({ ...existing, role: 'owner', status: 'active' });
            }
          }
        } catch (e) {
          console.warn('Profile initialization error:', e);
        }

        // Real-time listener for current user document updates
        unsubUserDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            if (isOwnerEmail(firebaseUser.email) && data.role !== 'owner') {
              setCurrentUser({ ...data, role: 'owner', status: 'active' });
            } else {
              setCurrentUser(data);
            }
          }
        });
      } else {
        setCurrentUser(null);
      }
      setIsAuthChecking(false);
    });

    return () => {
      unsubAuth();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, [setCurrentUser]);

  // Sync authentic Team Directory directly from Firestore
  useEffect(() => {
    try {
      const unsubTeam = onSnapshot(collection(db, 'users'), (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((d) => list.push(d.data() as UserProfile));
        setTeamUsers(list);
      });
      return () => unsubTeam();
    } catch (e) {
      console.warn('Team snapshot fallback:', e);
    }
  }, []);

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

  // 3. Unassigned or pending approval -> Locked to Waiting Room View
  if (currentUser.role === 'unassigned' || currentUser.status === 'pending_approval') {
    return <WaitingRoomView />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1C1D21] flex flex-col font-sans select-none overflow-hidden">
      {/* Main Workspace with clean, minimal layout and zero visual bloat */}
      <main className="flex-1 flex overflow-hidden">
        <OrderDashboard teamUsers={teamUsers} />
      </main>

      {/* Team Governance Modal */}
      <TeamGovernanceModal />

      {/* Auto-Updater Available Notification & 1-Click Installer */}
      <UpdateNotifier />
    </div>
  );
}

export default App;
