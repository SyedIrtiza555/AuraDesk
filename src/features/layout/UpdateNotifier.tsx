import { useEffect } from 'react';
import { create } from 'zustand';
import type { Update } from '@tauri-apps/plugin-updater';
import { ArrowDownToLine, Sparkles, X } from 'lucide-react';
import { isTauri } from '../../shared/notifications';
import { Button, IconButton, toast } from '../../shared/ui';

interface UpdaterState {
  update: Update | null;
  dismissed: boolean;
  installing: boolean;
  progress: number;
  status: string;
  check: (manual?: boolean) => Promise<void>;
  install: () => Promise<void>;
  dismiss: () => void;
}

/** Shared updater state so the sidebar's "Check for updates" and the banner stay in sync. */
export const useUpdater = create<UpdaterState>((set, get) => ({
  update: null,
  dismissed: false,
  installing: false,
  progress: 0,
  status: '',

  check: async (manual = false) => {
    if (!isTauri()) {
      if (manual) toast.info('Updates run in the desktop app', 'The web preview always runs the latest code.');
      return;
    }
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        set({ update, dismissed: false });
        if (manual) toast.success(`Version ${update.version} is ready`, 'Use “Update now” in the top-right corner.');
      } else if (manual) {
        toast.success("You're up to date", `Aura Desk ${__APP_VERSION__}`);
      }
    } catch (err) {
      console.warn('[Aura Desk Updater Check]:', err);
      if (manual) toast.error('Could not check for updates', err instanceof Error ? err.message : String(err));
    }
  },

  install: async () => {
    const { update } = get();
    if (!update) return;
    set({ installing: true, status: 'Downloading…', progress: 0 });
    try {
      let downloaded = 0;
      let total = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength || 0;
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          if (total > 0) set({ progress: Math.round((downloaded / total) * 100) });
        } else if (event.event === 'Finished') {
          set({ status: 'Installing…' });
        }
      });
      set({ status: 'Restarting…' });
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (err) {
      console.error('[Aura Desk Update Failed]:', err);
      set({ installing: false, status: '' });
      toast.error('Update failed', err instanceof Error ? err.message : String(err));
    }
  },

  dismiss: () => set({ dismissed: true }),
}));

export function UpdateNotifier() {
  const { update, dismissed, installing, progress, status, check, install, dismiss } = useUpdater();

  // Check on start and every 15 minutes
  useEffect(() => {
    check();
    const interval = setInterval(() => check(), 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [check]);

  if (!update || (dismissed && !installing)) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-[340px] animate-rise-in">
      <div className="relative overflow-hidden rounded-2xl bg-ink text-white shadow-pop p-4">
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-aura/30 blur-2xl" />
        <div className="relative flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-aura text-ink flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Aura Desk {update.version} is here</div>
            <div className="text-xs text-white/60 mt-0.5 line-clamp-2">
              {installing ? status : update.body || 'Fixes and improvements are ready to install.'}
            </div>
          </div>
          {!installing && (
            <IconButton label="Later" tone="inverse" size="sm" onClick={dismiss} className="-mr-1 -mt-1">
              <X className="w-4 h-4" />
            </IconButton>
          )}
        </div>

        {installing ? (
          <div className="relative mt-3.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-aura transition-all duration-200" style={{ width: `${Math.max(progress, 4)}%` }} />
          </div>
        ) : (
          <Button variant="aura" size="sm" className="relative mt-3.5 w-full" onClick={install}>
            <ArrowDownToLine className="w-3.5 h-3.5" /> Update now
          </Button>
        )}
      </div>
    </div>
  );
}
