import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from './shared/firebase';
import { useUIStore } from './shared/store';
import type { UserProfile } from './shared/types';
import { ensureUserProfile } from './shared/userProfile';
import { isDemo, DEMO_TEAM } from './shared/demo';
import { DemoRoleSwitcher } from './features/layout/DemoRoleSwitcher';
import { Toaster, ConfirmHost, LogoMark, Spinner } from './shared/ui';
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
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(!isDemo);

  // Firebase Auth state -> ensure profile doc -> live profile listener.
  // The Firestore doc is the only source of truth for role/status (it is what the rules enforce).
  useEffect(() => {
    if (isDemo) return;
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
    if (!canReadTeam || isDemo) return;
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
  const teamUsers = isDemo ? DEMO_TEAM : canReadTeam ? teamSnapshot : [];

  return (
    <>
      <Screen isAuthChecking={isAuthChecking} currentUser={currentUser} teamUsers={teamUsers} />
      <Toaster />
      <ConfirmHost />
      {isDemo && <DemoRoleSwitcher />}
    </>
  );
}

function Screen({
  isAuthChecking,
  currentUser,
  teamUsers,
}: {
  isAuthChecking: boolean;
  currentUser: UserProfile | null;
  teamUsers: UserProfile[];
}) {
  // 1. Initial auth check -> branded splash (prevents a flash of the login screen)
  if (isAuthChecking) {
    return (
      <div className="h-full aura-backdrop flex flex-col justify-center items-center animate-fade-in">
        <LogoMark glow className="w-16 h-16" />
        <h1 className="mt-6 font-display text-3xl text-ink">
          Aura <span className="italic text-copper">Desk</span>
        </h1>
        <div className="flex items-center gap-2 mt-3 text-sm text-muted">
          <Spinner className="w-3.5 h-3.5" />
          <span>Opening your workspace…</span>
        </div>
      </div>
    );
  }

  // 2. Signed out
  if (!currentUser) return <AuthView />;

  // 3. Unassigned, pending approval or suspended
  if (currentUser.role === 'unassigned' || currentUser.status !== 'active') return <WaitingRoomView />;

  return (
    <div className="h-full flex overflow-hidden">
      <OrderDashboard teamUsers={teamUsers} />
      <TeamGovernanceModal teamUsers={teamUsers} />
      <UpdateNotifier />
    </div>
  );
}

export default App;
