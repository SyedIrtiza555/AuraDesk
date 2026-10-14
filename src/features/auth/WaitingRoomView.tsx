import { Clock, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '../../shared/ui';
import { useUIStore } from '../../shared/store';
import { auth } from '../../shared/firebase';

export function WaitingRoomView() {
  const currentUser = useUIStore((s) => s.currentUser);
  const setCurrentUser = useUIStore((s) => s.setCurrentUser);

  const handleSignOut = () => {
    try {
      auth.signOut();
    } catch (e) {
      console.warn(e);
    }
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col justify-center items-center p-6 text-[#1C1D21] select-none">
      <div className="max-w-sm w-full glass-floating border border-white/80 rounded-3xl p-8 shadow-xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-600">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>

        <h2 className="text-lg font-semibold text-[#1C1D21] mb-1.5">
          Registration Pending
        </h2>
        <p className="text-xs text-[#6B7280] mb-6 leading-relaxed">
          Welcome <strong className="text-[#1C1D21]">{currentUser?.displayName || 'Applicant'}</strong>.
          Your account is currently waiting for an agency owner to grant role access.
        </p>

        <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-4 mb-6 text-left space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-[#1C1D21] font-semibold">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Role Verification</span>
          </div>
          <p className="text-[#6B7280] leading-relaxed text-[11px]">
            Once approved by an Owner, you will automatically have access to your assigned workspace pipeline.
          </p>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full text-xs py-2"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Check Status
          </Button>

          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full text-xs text-[#6B7280] hover:text-[#1C1D21]"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
