import { useState } from 'react';
import { doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../shared/firebase';
import type { UserProfile, UserRole } from '../../shared/types';
import { useUIStore } from '../../shared/store';
import { isDemo } from '../../shared/demo';
import { Avatar, Badge, Button, IconButton, Select, confirmDialog, toast, cn } from '../../shared/ui';
import { Check, UserX, UserCheck, KeyRound, Trash2, Eraser, Info } from 'lucide-react';

// Mirrors isStaffRole() in firestore.rules: what an admin may assign or manage
const STAFF_ROLES: UserRole[] = ['unassigned', 'sales_agent', 'designer'];

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  sales_agent: 'Sales agent',
  designer: 'Designer',
  unassigned: 'No role yet',
};

const ROLE_RANK: Record<UserRole, number> = { owner: 0, admin: 1, sales_agent: 2, designer: 3, unassigned: 4 };

const describeError = (err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('permission')
    ? 'Firestore rejected this change. Make sure the latest firestore.rules are deployed.'
    : msg;
};

export function TeamMemberList({ members }: { members: UserProfile[] }) {
  const currentUser = useUIStore((s) => s.currentUser);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const isOwner = currentUser?.role === 'owner';
  const isAdmin = currentUser?.role === 'admin';

  const canManage = (m: UserProfile) =>
    m.uid !== currentUser?.uid && (isOwner || (isAdmin && STAFF_ROLES.includes(m.role)));
  const roleOptions: UserRole[] = isOwner ? ['unassigned', 'sales_agent', 'designer', 'admin', 'owner'] : STAFF_ROLES;

  const pending = members.filter((m) => m.status === 'pending_approval' && m.uid !== currentUser?.uid);
  const others = members.filter((m) => m.uid !== currentUser?.uid);
  const rest = [...members]
    .filter((m) => !pending.includes(m))
    .sort((a, b) => {
      if (a.uid === currentUser?.uid) return -1;
      if (b.uid === currentUser?.uid) return 1;
      return ROLE_RANK[a.role] - ROLE_RANK[b.role] || a.displayName.localeCompare(b.displayName);
    });

  const run = async (uid: string, action: () => Promise<void>, success?: string) => {
    if (isDemo) {
      toast.info('Demo mode', 'Team changes are not saved in the preview.');
      return;
    }
    setBusyUid(uid);
    try {
      await action();
      if (success) toast.success(success);
    } catch (err) {
      console.warn('[Aura Desk] Team action failed:', err);
      toast.error('That did not work', describeError(err));
    } finally {
      setBusyUid(null);
    }
  };

  const handleRole = (m: UserProfile, role: UserRole) =>
    run(
      m.uid,
      () =>
        updateDoc(doc(db, 'users', m.uid), {
          role,
          status: role === 'unassigned' ? 'pending_approval' : 'active',
          approvedAt: Date.now(),
          approvedBy: currentUser?.displayName ?? null,
        }),
      role === 'unassigned' ? `${m.displayName} no longer has a role` : `${m.displayName} is now ${ROLE_LABELS[role].toLowerCase()}`
    );

  const handleStatus = (m: UserProfile, status: 'active' | 'suspended') =>
    run(
      m.uid,
      () => updateDoc(doc(db, 'users', m.uid), { status }),
      status === 'suspended' ? `${m.displayName} is suspended` : `${m.displayName} is active again`
    );

  const handleReset = (m: UserProfile) =>
    run(m.uid, () => sendPasswordResetEmail(auth, m.email), `Reset email sent to ${m.email}`);

  const handleRemove = async (m: UserProfile) => {
    const ok = await confirmDialog({
      title: `Remove ${m.displayName}?`,
      description: `${m.email} loses access right away. If they sign in again they come back as a pending request.`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (ok) run(m.uid, () => deleteDoc(doc(db, 'users', m.uid)), `${m.displayName} removed`);
  };

  const handleKeepOnlyMe = async () => {
    if (others.length === 0) return;
    const ok = await confirmDialog({
      title: 'Keep only your account?',
      description: `This removes ${others.length} other member profile${others.length === 1 ? '' : 's'}. Use it to start fresh.`,
      confirmLabel: `Remove ${others.length}`,
      danger: true,
    });
    if (!ok) return;
    run(
      'bulk',
      async () => {
        const batch = writeBatch(db);
        others.forEach((m) => batch.delete(doc(db, 'users', m.uid)));
        await batch.commit();
      },
      `Removed ${others.length} profile${others.length === 1 ? '' : 's'}. You're the only member now.`
    );
  };

  const row = (member: UserProfile) => {
    const isMe = member.uid === currentUser?.uid;
    const isPending = member.status === 'pending_approval';
    const busy = busyUid === member.uid || busyUid === 'bulk';

    return (
      <div key={member.uid} className="px-3 py-2 flex items-center gap-2.5 hover:bg-surface-muted transition-colors">
        <Avatar name={member.displayName} initials={member.initials} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-ink truncate">{member.displayName}</span>
            {isMe && <span className="text-xs text-faint">(you)</span>}
            {member.role === 'owner' && <Badge variant="ink">Owner</Badge>}
            {isPending && <Badge variant="warning">Waiting for approval</Badge>}
            {member.status === 'suspended' && <Badge variant="danger">Suspended</Badge>}
          </div>
          <div className="text-xs text-muted truncate">{member.email}</div>
        </div>

        {canManage(member) ? (
          <div className="flex items-center gap-1.5 shrink-0">
            {isPending ? (
              <>
                <Select
                  defaultValue=""
                  disabled={busy}
                  onChange={(e) => e.target.value && handleRole(member, e.target.value as UserRole)}
                  className="h-7 w-36 text-xs"
                >
                  <option value="" disabled>
                    Approve as…
                  </option>
                  {roleOptions
                    .filter((r) => r !== 'unassigned')
                    .map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                </Select>
                <Button size="sm" variant="accent" disabled={busy} onClick={() => handleRole(member, 'designer')}>
                  <Check className="w-3.5 h-3.5" /> Designer
                </Button>
              </>
            ) : (
              <Select
                value={member.role}
                disabled={busy}
                onChange={(e) => handleRole(member, e.target.value as UserRole)}
                className="h-7 w-32 text-xs"
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            )}

            <IconButton label="Send password reset email" disabled={busy} onClick={() => handleReset(member)}>
              <KeyRound className="w-4 h-4" />
            </IconButton>
            {member.status === 'active' && (
              <IconButton label="Suspend" tone="danger" disabled={busy} onClick={() => handleStatus(member, 'suspended')}>
                <UserX className="w-4 h-4" />
              </IconButton>
            )}
            {member.status === 'suspended' && (
              <IconButton label="Reactivate" tone="success" disabled={busy} onClick={() => handleStatus(member, 'active')}>
                <UserCheck className="w-4 h-4" />
              </IconButton>
            )}
            {isOwner && (
              <IconButton label="Remove from workspace" tone="danger" disabled={busy} onClick={() => handleRemove(member)}>
                <Trash2 className="w-4 h-4" />
              </IconButton>
            )}
          </div>
        ) : (
          <span className="text-[13px] font-medium text-muted shrink-0">{ROLE_LABELS[member.role]}</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-xs font-medium text-muted mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Waiting for approval
            <span className="text-muted font-normal">· {pending.length}</span>
          </h3>
          <div className="bg-surface border border-amber-200 rounded-lg divide-y divide-line overflow-hidden">
            {pending.map(row)}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-medium text-muted">
            Members <span className="text-muted font-normal">· {rest.length}</span>
          </h3>
          {isOwner && (
            <Button size="sm" variant="ghost" onClick={handleKeepOnlyMe} disabled={others.length === 0 || busyUid !== null}>
              <Eraser className="w-3.5 h-3.5" /> Keep only me
            </Button>
          )}
        </div>
        <div className="bg-surface border border-line rounded-lg divide-y divide-line overflow-hidden">
          {rest.map(row)}
        </div>
      </section>

      {isOwner && (
        <p className={cn('flex gap-2 text-xs text-muted leading-relaxed')}>
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Removing someone here revokes app access. Deleting a user in the Firebase console does not remove them from
          this list, so remove them here too.
        </p>
      )}
    </div>
  );
}
