import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../shared/firebase';
import type { UserProfile, UserRole } from '../../shared/types';
import { useUIStore } from '../../shared/store';
import { Button, Badge } from '../../shared/ui';
import { X, Check, Shield, UserX } from 'lucide-react';

export function TeamGovernanceModal() {
  const isTeamModalOpen = useUIStore((s) => s.isTeamModalOpen);
  const closeTeamModal = useUIStore((s) => s.closeTeamModal);
  const currentUser = useUIStore((s) => s.currentUser);

  // Clean state reading directly from authentic Firestore database (zero mock seed)
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isTeamModalOpen) return;

    try {
      const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as UserProfile);
        });
        setUsers(list);
      });
      return () => unsub();
    } catch (e) {
      console.warn('[Aura Desk] Firestore users listener:', e);
    }
  }, [isTeamModalOpen]);

  if (!isTeamModalOpen) return null;

  const handleUpdateRole = async (targetUid: string, newRole: UserRole) => {
    setLoading(true);
    try {
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === targetUid
            ? { ...u, role: newRole, status: 'active', approvedAt: Date.now(), approvedBy: currentUser?.displayName }
            : u
        )
      );

      await updateDoc(doc(db, 'users', targetUid), {
        role: newRole,
        status: 'active',
        approvedAt: Date.now(),
        approvedBy: currentUser?.displayName,
      });
    } catch (err) {
      console.warn('Firestore update:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (targetUid: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.uid === targetUid ? { ...u, status: 'suspended' } : u))
    );
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        status: 'suspended',
      });
    } catch (err) {
      console.warn(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-floating rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-white/90">
        {/* Header */}
        <div className="p-5 border-b border-slate-200/60 flex items-center justify-between bg-white/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#1C1D21] flex items-center justify-center text-white">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#1C1D21] flex items-center gap-2">
                Team Governance Console
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Owner
                </span>
              </h2>
              <p className="text-xs text-[#6B7280]">
                Authorize new registrations and assign roles.
              </p>
            </div>
          </div>
          <button
            onClick={closeTeamModal}
            className="text-slate-400 hover:text-[#1C1D21] p-1.5 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Members */}
        <div className="p-5 overflow-y-auto space-y-3">
          {users.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 italic">
              No registered team members found in database.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200/60 rounded-2xl overflow-hidden bg-white/80">
              {users.map((member) => {
                const isOwner = member.role === 'owner';
                const isPending = member.status === 'pending_approval';

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
                          </span>
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

                    <div className="flex items-center gap-2">
                      {isOwner ? (
                        <span className="text-xs font-medium text-slate-600 px-2.5 py-1 bg-slate-100 rounded-lg">
                          Global Owner
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            value={member.role}
                            disabled={loading}
                            onChange={(e) =>
                              handleUpdateRole(member.uid, e.target.value as UserRole)
                            }
                            className="bg-white border border-slate-200 rounded-lg text-xs px-2.5 py-1 text-slate-700 focus:outline-none"
                          >
                            <option value="unassigned">Unassigned</option>
                            <option value="sales_agent">Sales Agent</option>
                            <option value="designer">Designer</option>
                            <option value="admin">Admin</option>
                          </select>

                          {isPending && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleUpdateRole(member.uid, 'designer')}
                              className="text-xs py-1"
                            >
                              <Check className="w-3 h-3 mr-1" /> Approve
                            </Button>
                          )}

                          {member.status === 'active' && (
                            <button
                              onClick={() => handleSuspend(member.uid)}
                              title="Suspend"
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 bg-white/60 border-t border-slate-200/60 flex items-center justify-end">
          <Button variant="secondary" size="sm" onClick={closeTeamModal}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
