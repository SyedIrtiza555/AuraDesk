import { Clock, ShieldOff, LogOut, RefreshCw, Check } from 'lucide-react';
import { Button, Logo, cn } from '../../shared/ui';
import { useUIStore } from '../../shared/store';
import { auth } from '../../shared/firebase';

export function WaitingRoomView() {
  const currentUser = useUIStore((s) => s.currentUser);
  const setCurrentUser = useUIStore((s) => s.setCurrentUser);
  const isSuspended = currentUser?.status === 'suspended';
  const firstName = currentUser?.displayName?.split(' ')[0] || 'there';

  const handleSignOut = () => {
    auth.signOut().catch((e) => console.warn(e));
    setCurrentUser(null);
  };

  const steps = [
    { label: 'Account created', done: true },
    { label: 'Owner approves your request', active: true },
    { label: 'Your workspace opens with your role' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-surface-muted animate-fade-in">
      <div className="min-h-full flex flex-col items-center justify-center p-6">
        <Logo className="mb-6" />

        <div className="w-full max-w-[400px] bg-surface border border-line rounded-xl shadow-card p-6 animate-rise-in">
          <div className={cn('flex items-center gap-2 text-xs font-medium', isSuspended ? 'text-rose-600' : 'text-accent')}>
            {isSuspended ? <ShieldOff className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            {isSuspended ? 'Access suspended' : 'Waiting for approval'}
          </div>
          <h1 className="mt-2 text-[17px] font-semibold text-ink">
            {isSuspended ? 'Your access is paused' : `Almost there, ${firstName}`}
          </h1>
          <p className="mt-1 text-[13px] text-muted leading-relaxed">
            {isSuspended
              ? 'An owner has suspended this account. Contact them to restore access.'
              : 'An owner needs to approve your account and assign a role. This page updates automatically when they do.'}
          </p>

          {!isSuspended && (
            <ol className="mt-5 space-y-2.5">
              {steps.map((s) => (
                <li key={s.label} className="flex items-center gap-2.5 text-[13px]">
                  <span
                    className={cn(
                      'w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0',
                      s.done ? 'bg-accent text-white' : s.active ? 'border-2 border-accent' : 'border border-line-strong'
                    )}
                  >
                    {s.done && <Check className="w-3 h-3" />}
                  </span>
                  <span className={s.done || s.active ? 'text-ink' : 'text-faint'}>{s.label}</span>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-6 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => window.location.reload()}>
              <RefreshCw className="w-3.5 h-3.5" /> Check again
            </Button>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </Button>
          </div>
        </div>

        <p className="mt-4 text-xs text-faint">Signed in as {currentUser?.email}</p>
      </div>
    </div>
  );
}
