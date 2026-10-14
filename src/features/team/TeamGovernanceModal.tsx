import type { UserProfile } from '../../shared/types';
import { useUIStore } from '../../shared/store';
import { Button } from '../../shared/ui';
import { X, Shield, ExternalLink } from 'lucide-react';
import { TeamMemberList } from './TeamMemberList';

export function TeamGovernanceModal({ teamUsers }: { teamUsers: UserProfile[] }) {
  const isTeamModalOpen = useUIStore((s) => s.isTeamModalOpen);
  const closeTeamModal = useUIStore((s) => s.closeTeamModal);
  const currentUser = useUIStore((s) => s.currentUser);

  if (!isTeamModalOpen) return null;

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
                Team Governance & Auth Settings
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {currentUser?.role || 'Admin'}
                </span>
              </h2>
              <p className="text-xs text-[#6B7280]">
                Authorize new registrations, assign agency roles, and reset member passwords.
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

        {/* Master Auth Settings Link Banner */}
        <div className="mx-5 mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
          <div>
            <span className="font-semibold text-slate-800">Firebase Cloud Authentication:</span> Project <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[11px]">aura-cad-2</code>
          </div>
          <a
            href="https://console.firebase.google.com/project/aura-cad-2/authentication/users"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-slate-900 font-semibold hover:underline"
          >
            Open Console <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Members */}
        <div className="p-5 overflow-y-auto">
          <TeamMemberList members={teamUsers} />
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
