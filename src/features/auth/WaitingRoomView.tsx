import { Hourglass, ShieldOff, LogOut, RefreshCw, Check } from 'lucide-react';
import { Button, LogoMark } from '../../shared/ui';
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
    { label: 'Owner reviews your request', done: false, active: true },
    { label: 'You get a role and your workspace opens', done: false },
  ];

  return (
    <div className="h-full aura-backdrop flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md bg-surface rounded-3xl shadow-pop p-8 animate-rise-in">
        <div className="flex items-center justify-between">
          <LogoMark />
          <span className="text-xs text-muted">{currentUser?.email}</span>
        </div>

        <div
          className={`mt-8 w-14 h-14 rounded-2xl flex items-center justify-center ${
            isSuspended ? 'bg-rose-100 text-rose-700' : 'bg-aura-soft text-aura-deep'
          }`}
        >
          {isSuspended ? <ShieldOff className="w-6 h-6" /> : <Hourglass className="w-6 h-6" />}
        </div>

        <h1 className="mt-5 font-display text-[28px] leading-tight text-ink">
          {isSuspended ? 'Your access is paused' : `Almost there, ${firstName}`}
        </h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          {isSuspended
            ? 'An owner has suspended this account. Reach out to them to restore access.'
            : 'Your account is waiting for an owner to approve it and assign your role. This page updates on its own as soon as they do.'}
        </p>

        {!isSuspended && (
          <ol className="mt-6 space-y-3">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-3 text-sm">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    s.done
                      ? 'bg-ink text-aura'
                      : s.active
                        ? 'ring-2 ring-aura bg-aura-soft'
                        : 'ring-1 ring-line-strong'
                  }`}
                >
                  {s.done && <Check className="w-3.5 h-3.5" />}
                  {s.active && <span className="w-2 h-2 rounded-full bg-aura-deep animate-aura-pulse" />}
                </span>
                <span className={s.done || s.active ? 'text-ink font-medium' : 'text-faint'}>{s.label}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-8 flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4" /> Check again
          </Button>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
