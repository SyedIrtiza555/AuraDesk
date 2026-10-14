import { create } from 'zustand';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Button, Modal } from './primitives';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState {
  request: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null;
  open: (opts: ConfirmOptions) => Promise<boolean>;
  settle: (ok: boolean) => void;
}

const useConfirmStore = create<ConfirmState>((set, get) => ({
  request: null,
  open: (opts) =>
    new Promise<boolean>((resolve) => {
      get().request?.resolve(false);
      set({ request: { ...opts, resolve } });
    }),
  settle: (ok) => {
    get().request?.resolve(ok);
    set({ request: null });
  },
}));

/** In-app replacement for window.confirm. Resolves true when the user confirms. */
export const confirmDialog = (opts: ConfirmOptions) => useConfirmStore.getState().open(opts);

export function ConfirmHost() {
  const request = useConfirmStore((s) => s.request);
  const settle = useConfirmStore((s) => s.settle);

  return (
    <Modal
      open={Boolean(request)}
      onClose={() => settle(false)}
      size="sm"
      title={request?.title ?? ''}
      description={request?.description}
      tone={request?.danger ? 'danger' : 'default'}
      icon={request?.danger ? <AlertTriangle /> : <HelpCircle />}
      footer={
        <>
          <Button variant="ghost" onClick={() => settle(false)}>
            {request?.cancelLabel ?? 'Cancel'}
          </Button>
          <Button variant={request?.danger ? 'danger' : 'primary'} onClick={() => settle(true)} autoFocus>
            {request?.confirmLabel ?? 'Confirm'}
          </Button>
        </>
      }
    />
  );
}
