import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from './shared/firebase';
import { useUIStore } from './shared/store';
import type { UserProfile } from './shared/types';
import { AuthView } from './features/auth/AuthView';
import { WaitingRoomView } from './features/auth/WaitingRoomView';
import { TeamGovernanceModal } from './features/team/TeamGovernanceModal';
import { OrderDashboard } from './features/orders/OrderDashboard';
import { UpdaterBanner } from './features/updater/UpdaterBanner';

export function App() {
  const currentUser = useUIStore((s) => s.currentUser);
  const setCurrentUser = useUIStore((s) => s.setCurrentUser);

  const [teamUsers, setTeamUsers] = useState<UserProfile[]>([]);

  // Sync authentic Firebase Auth state & Real-Time Profile Listener
  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      if (firebaseUser) {
        // Ensure user doc exists in Firestore; if not, create one
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userDocRef);
          if (!snap.exists()) {
            const initialRole = firebaseUser.email?.toLowerCase().includes('shahrukh') ? 'owner' : 'unassigned';
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
          }
        } catch (e) {
          console.warn('Profile initialization error:', e);
        }

        // Real-time listener for current user document updates (e.g. role promotions)
        unsubUserDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setCurrentUser(docSnap.data() as UserProfile);
          }
        });
      } else {
        setCurrentUser(null);
      }
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

  // 1. Unauthenticated -> Show clean Auth View
  if (!currentUser) {
    return <AuthView />;
  }

  // 2. Unassigned or pending approval -> Locked to Waiting Room View
  if (currentUser.role === 'unassigned' || currentUser.status === 'pending_approval') {
    return <WaitingRoomView />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1C1D21] flex flex-col font-sans select-none overflow-hidden">
      {/* Background Auto-Updater notification banner */}
      <UpdaterBanner />

      {/* Main Workspace with clean, minimal layout and zero visual bloat */}
      <main className="flex-1 flex overflow-hidden">
        <OrderDashboard teamUsers={teamUsers} />
      </main>

      {/* Team Governance Modal */}
      <TeamGovernanceModal />
    </div>
  );
}

export default App;
