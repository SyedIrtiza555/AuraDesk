import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

// Safe check if running inside Tauri desktop webview
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

/**
 * Dispatch desktop notifications via Tauri native plugin
 * Fallbacks to standard Web Notification API if previewing in browser
 */
export async function dispatchNativeNotification(title: string, body: string) {
  try {
    if (isTauri()) {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }

      if (permissionGranted) {
        sendNotification({
          title,
          body,
        });
        return;
      }
    }

    // Web fallback for browser preview mode
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(title, { body });
        }
      }
    }
  } catch (err) {
    console.warn('[Aura Desk] Notification dispatch failed:', err);
  }
}

/**
 * 1-click clipboard copy utilizing Tauri clipboard manager plugin with browser fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (isTauri()) {
      await writeText(text);
      return true;
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[Aura Desk] Clipboard write failed:', err);
    return false;
  }
}
