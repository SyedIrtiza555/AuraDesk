import { doc, runTransaction, updateDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './firebase';
import type { UserProfile, UserRole } from './types';

// Accounts that are always the agency owner. Keep in sync with isOwnerEmail() in firestore.rules.
export const OWNER_EMAILS = ['s.irtizahussain@gmail.com'];

export const isOwnerEmail = (email?: string | null) =>
  Boolean(email && OWNER_EMAILS.includes(email.toLowerCase().trim()));

export const toInitials = (name: string) =>
  name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase())
    .slice(0, 2)
    .join('') || 'U';

/**
 * The single place a profile doc is created. New accounts start unassigned/pending
 * (the Firestore rules reject anything else); the owner email starts as an active owner.
 * Existing profiles are only touched to promote the owner email or to fill in a display name.
 */
export async function ensureUserProfile(user: User, displayNameOverride?: string): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const isOwner = isOwnerEmail(user.email);

  // Transaction so App.tsx and AuthView can both call this at sign-up without clobbering each other
  const existing = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return snap.data() as UserProfile;

    const displayName =
      displayNameOverride?.trim() || user.displayName || user.email?.split('@')[0] || 'Team Member';
    const role: UserRole = isOwner ? 'owner' : 'unassigned';
    const profile: UserProfile = {
      uid: user.uid,
      email: (user.email || '').toLowerCase(),
      displayName,
      role,
      status: isOwner ? 'active' : 'pending_approval',
      initials: toInitials(displayName),
      createdAt: Date.now(),
      ...(user.photoURL ? { photoURL: user.photoURL } : {}),
    };
    tx.set(ref, profile);
    return null;
  });
  if (!existing) return;

  if (isOwner && (existing.role !== 'owner' || existing.status !== 'active')) {
    await updateDoc(ref, { role: 'owner', status: 'active' });
  }
  const name = displayNameOverride?.trim();
  if (name && name !== existing.displayName) {
    await updateDoc(ref, { displayName: name, initials: toInitials(name) });
  }
}
