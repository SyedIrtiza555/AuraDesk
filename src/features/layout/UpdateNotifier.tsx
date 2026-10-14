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
    <div className="fixed bottom-4 right-4 z-50 w-[300px] animate-rise-in">
      <div className="rounded-lg bg-surface border border-line shadow-pop p-3">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-accent mt-px shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-ink">Version {update.version} is available</div>
            <div className="text-xs text-muted mt-0.5 line-clamp-2">
              {installing ? status : update.body || 'Fixes and improvements are ready to install.'}
            </div>
          </div>
          {!installing && (
            <IconButton label="Later" size="sm" onClick={dismiss} className="-mr-1 -mt-0.5">
              <X className="w-3.5 h-3.5" />
            </IconButton>
          )}
        </div>

        {installing ? (
          <div className="mt-3 h-1 rounded-full bg-line overflow-hidden">
            <div className="h-full bg-accent transition-all duration-200" style={{ width: `${Math.max(progress, 4)}%` }} />
          </div>
        ) : (
          <Button variant="accent" size="sm" className="mt-3 w-full" onClick={install}>
            <ArrowDownToLine className="w-3.5 h-3.5" /> Update and restart
          </Button>
        )}
      </div>
    </div>
  );
}
