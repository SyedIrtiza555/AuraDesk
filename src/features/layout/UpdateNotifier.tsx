import { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { ArrowDownCircle, RefreshCw, Sparkles } from 'lucide-react';

export function UpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [newVersion, setNewVersion] = useState<string>('');
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [updateObj, setUpdateObj] = useState<any>(null);

  // Check for updates on mount and periodically every 15 minutes
  useEffect(() => {
    let isMounted = true;

    const checkAppUpdate = async () => {
      try {
        const update = await check();
        if (update && isMounted) {
          setUpdateAvailable(true);
          setNewVersion(update.version);
          setReleaseNotes(update.body || 'New features, performance enhancements, and bug fixes.');
          setUpdateObj(update);
        }
      } catch (err) {
        console.warn('[Aura Desk Updater Check]:', err);
      }
    };

    checkAppUpdate();
    const interval = setInterval(checkAppUpdate, 15 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleApplyUpdate = async () => {
    if (!updateObj) return;

    setIsUpdating(true);
    setStatusText('Downloading update...');

    try {
      let downloaded = 0;
      let total = 0;

      await updateObj.downloadAndInstall((event: any) => {
        if (event.event === 'Started') {
          total = event.data.contentLength || 0;
          setStatusText('Downloading package...');
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          if (total > 0) {
            setDownloadProgress(Math.round((downloaded / total) * 100));
          }
        } else if (event.event === 'Finished') {
          setStatusText('Installing and finalizing update...');
        }
      });

      setStatusText('Relaunching updated Aura Desk...');
      await relaunch();
    } catch (err: unknown) {
      console.error('[Aura Desk Update Failed]:', err);
      setStatusText(err instanceof Error ? err.message : 'Update failed');
      setIsUpdating(false);
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-3 right-5 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="glass-floating px-4 py-2.5 rounded-2xl shadow-xl border border-emerald-500/30 bg-emerald-50/90 text-emerald-950 flex items-center gap-3 select-none backdrop-blur-md">
        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Sparkles className="w-4 h-4 animate-pulse" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-900">
            <span>Update Available</span>
            <span className="font-mono text-[10px] bg-emerald-200/80 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
              v{newVersion}
            </span>
          </div>
          <div className="text-[11px] text-emerald-700/90 max-w-[200px] truncate">
            {isUpdating ? statusText : releaseNotes}
          </div>
          {isUpdating && downloadProgress > 0 && (
            <div className="w-full bg-emerald-200/80 rounded-full h-1 mt-1 overflow-hidden">
              <div
                className="bg-emerald-600 h-1 rounded-full transition-all duration-200"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          )}
        </div>

        <button
          onClick={handleApplyUpdate}
          disabled={isUpdating}
          className="ml-2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{downloadProgress > 0 ? `${downloadProgress}%` : 'Updating...'}</span>
            </>
          ) : (
            <>
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span>Update Now</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
