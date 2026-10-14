import { useState } from 'react';
import { doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../shared/firebase';
import type { UserProfile, UserRole } from '../../shared/types';
import { useUIStore } from '../../shared/store';
import { Button, Badge } from '../../shared/ui';
import { Check, UserX, UserCheck, KeyRound, Trash2, Eraser } from 'lucide-react';

// Mirrors isStaffRole() in firestore.rules: what an admin may assign or manage
const STAFF_ROLES: UserRole[] = ['unassigned', 'sales_agent', 'designer'];

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  sales_agent: 'Sales Agent',
  designer: 'Designer',
  unassigned: 'Unassigned',
};

const ROLE_RANK: Record<UserRole, number> = {
  owner: 0,
  admin: 1,
  sales_agent: 2,
  designer: 3,
  unassigned: 4,
};

const describeError = (err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('permission')
    ? 'Firestore rejected this change. Make sure the latest firestore.rules are deployed.'
    : msg;
};

export function TeamMemberList({ members }: { members: UserProfile[] }) {
  const currentUser = useUIStore((s) => s.currentUser);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const isOwner = currentUser?.role === 'owner';
  const isAdmin = currentUser?.role === 'admin';

  const canManage = (m: UserProfile) =>
    m.uid !== currentUser?.uid && (isOwner || (isAdmin && STAFF_ROLES.includes(m.role)));
  const roleOptions: UserRole[] = isOwner
    ? ['unassigned', 'sales_agent', 'designer', 'admin', 'owner']
    : STAFF_ROLES;

  const sorted = [...members].sort((a, b) => {
    if (a.uid === currentUser?.uid) return -1;
    if (b.uid === currentUser?.uid) return 1;
    const aPending = a.status === 'pending_approval' ? 0 : 1;
    const bPending = b.status === 'pending_approval' ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return ROLE_RANK[a.role] - ROLE_RANK[b.role] || a.displayName.localeCompare(b.displayName);
  });
  const others = members.filter((m) => m.uid !== currentUser?.uid);

  const flash = (text: string, isError = false) => {
    setFeedback({ text, isError });
    setTimeout(() => setFeedback(null), 6000);
  };

  const run = async (uid: string, action: () => Promise<void>, success?: string) => {
    setBusyUid(uid);
    try {
      await action();
      if (success) flash(success);
    } catch (err) {
      console.warn('[Aura Desk] Team action failed:', err);
      flash(describeError(err), true);
    } finally {
      setBusyUid(null);
    }
  };

  const handleRole = (m: UserProfile, role: UserRole) =>
    run(m.uid, () =>
      updateDoc(doc(db, 'users', m.uid), {
        role,
        status: role === 'unassigned' ? 'pending_approval' : 'active',
        approvedAt: Date.now(),
        approvedBy: currentUser?.displayName ?? null,
      })
    );

  const handleStatus = (m: UserProfile, status: 'active' | 'suspended') =>
    run(m.uid, () => updateDoc(doc(db, 'users', m.uid), { status }));

  const handleReset = (m: UserProfile) =>
    run(m.uid, () => sendPasswordResetEmail(auth, m.email), `Password reset email sent to ${m.email}`);

  const handleRemove = (m: UserProfile) => {
    if (!window.confirm(`Remove ${m.displayName} (${m.email}) from the workspace? They lose access immediately.`)) return;
    run(m.uid, () => deleteDoc(doc(db, 'users', m.uid)), `${m.displayName} removed`);
  };

  const handleKeepOnlyMe = () => {
    if (others.length === 0) return;
    if (!window.confirm(`Remove all ${others.length} other member profile(s) and keep only your owner account?`)) return;
    run(
      'bulk',
      async () => {
        const batch = writeBatch(db);
        others.forEach((m) => batch.delete(doc(db, 'users', m.uid)));
        await batch.commit();
      },
      `Removed ${others.length} member profile(s). You are the only member now.`
    );
  };

  return (
    <div className="space-y-3">
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs ${
            feedback.isError ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-slate-900 text-white'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {isOwner && (
        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-3 text-[11px] text-amber-900">
          <span>
            Removing a member revokes app access. Deleting someone in the Firebase console does{' '}
            <strong>not</strong> remove them here, so remove them here too.
          </span>
          <Button
            size="sm"
            variant="danger"
            onClick={handleKeepOnlyMe}
            disabled={others.length === 0 || busyUid !== null}
            className="text-xs py-1 shrink-0"
          >
            <Eraser className="w-3.5 h-3.5" /> Keep only me
          </Button>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-10 text-xs text-slate-400 italic">
          No registered team members found in database.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200/60 rounded-2xl overflow-hidden bg-white/80">
          {sorted.map((member) => {
            const isMe = member.uid === currentUser?.uid;
            const isPending = member.status === 'pending_approval';
            const busy = busyUid === member.uid || busyUid === 'bulk';

            return (
              <div
                key={member.uid}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-700 font-mono">
                    {member.initials || member.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-[#1C1D21]">
                        {member.displayName}
                        {isMe && <span className="text-slate-400 font-normal"> (you)</span>}
                      </span>
                      {member.role === 'owner' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-white font-medium">
                          Owner
                        </span>
                      )}
                      {isPending && (
                        <Badge variant="warning" className="text-[9px]">
                          Pending
                        </Badge>
                      )}
                      {member.status === 'suspended' && (
                        <Badge variant="danger" className="text-[9px]">
                          Suspended
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-[#6B7280]">{member.email}</div>
                  </div>
                </div>

                {canManage(member) ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      disabled={busy}
                      onChange={(e) => handleRole(member, e.target.value as UserRole)}
                      className="bg-white border border-slate-200 rounded-lg text-xs px-2.5 py-1 text-slate-700 focus:outline-none"
                    >
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>

                    {isPending && (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={busy}
                        onClick={() => handleRole(member, 'designer')}
                        className="text-xs py-1"
                      >
                        <Check className="w-3 h-3" /> Approve
                      </Button>
                    )}

                    <button
                      onClick={() => handleReset(member)}
                      disabled={busy}
                      title="Send Password Reset Email"
                      className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors flex items-center gap-1 text-[11px]"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reset Pwd</span>
                    </button>

                    {member.status === 'active' && (
                      <button
                        onClick={() => handleStatus(member, 'suspended')}
                        disabled={busy}
                        title="Suspend"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {member.status === 'suspended' && (
                      <button
                        onClick={() => handleStatus(member, 'active')}
                        disabled={busy}
                        title="Reactivate"
                        className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isOwner && (
                      <button
                        onClick={() => handleRemove(member)}
                        disabled={busy}
                        title="Remove from workspace"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs font-medium text-slate-600 px-2.5 py-1 bg-slate-100 rounded-lg">
                    {ROLE_LABELS[member.role]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
