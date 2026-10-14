# Aura Desk - Proactive Suggestions & Architectural Roadmap

## UI/UX & Desktop Ergonomics
1. **Global Keyboard Shortcuts (`tauri-plugin-global-shortcut` or local window listeners):**
   - `Ctrl + N`: Instant Order Intake Drawer (Sales Agent).
   - `Ctrl + F`: Omnibox order search across client names, IDs, titles.
   - `Escape`: Dismiss drawers/modals cleanly.
2. **Offline-Mode Indicator:**
   - Visual banner in the top navigation tracking Firestore sync status (`navigator.onLine` and Firestore network state).
3. **Optimistic UI with IndexedDB Rollback:**
   - Instant visual response on status transitions with background snapshot synchronization.
4. **WhatsApp Direct Deep Link:**
   - Direct launch into WhatsApp Desktop / Web (`https://wa.me/<phone>?text=...`) for the sales agent or delivery team when allowed.
