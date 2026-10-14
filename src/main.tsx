import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Native Tauri Window.open polyfill to prevent auth/popup-blocked on WebView2
if (typeof window !== 'undefined' && ((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__)) {
  const originalWindowOpen = window.open;

  window.open = function (url?: string | URL, target?: string, features?: string): Window | null {
    if (!url || url === 'about:blank') {
      return originalWindowOpen ? originalWindowOpen.call(window, url, target, features) : null;
    }

    try {
      // Dynamic import to avoid SSR issues
      import('@tauri-apps/api/webviewWindow').then(({ WebviewWindow }) => {
        const safeLabel = `auth_popup_${Date.now()}`;
        const win = new WebviewWindow(safeLabel, {
          url: url.toString(),
          title: 'Authentication',
          width: 540,
          height: 680,
          center: true,
          focus: true,
        });

        win.once('tauri://error', (e) => {
          console.warn('[Aura Desk Polyfill] Popup window error:', e);
        });
      }).catch((e) => {
        console.warn('[Aura Desk Polyfill] Could not load WebviewWindow:', e);
      });

      // Provide active window proxy to satisfy Firebase Auth SDK
      const proxy: any = {
        closed: false,
        close: () => { proxy.closed = true; },
        focus: () => {},
        blur: () => {},
        location: { href: url.toString() },
        postMessage: () => {},
      };
      return proxy as Window;
    } catch {
      return originalWindowOpen ? originalWindowOpen.call(window, url, target, features) : null;
    }
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
