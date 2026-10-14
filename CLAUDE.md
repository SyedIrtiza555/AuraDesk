# Aura Desk — project context

Role-based agency order-management desktop app. **Tauri v2** (Rust, Windows/WebView2) shell around a **React 19 + TS + Vite 8 + Tailwind v4** frontend, backed by **Firebase Auth + Firestore** (project `aura-cad-2`). Zustand holds UI state only; all data comes from Firestore `onSnapshot` listeners with `persistentLocalCache` (IndexedDB).

Repo: https://github.com/SyedIrtiza555/AuraDesk (`main`; `origin/v1` points at the same commit). Owner account: the email hardcoded in `src/features/auth/AuthView.tsx` (`OWNER_EMAILS`).

## Commands

```bash
npm ci                      # install
npm run dev                 # Vite on :5173 (strictPort)
npm run build               # tsc -b && vite build
npm run lint                # oxlint
npx vitest run              # tests/ (see "Tests" caveat below)
npx tauri dev               # desktop dev window
npx tauri build --bundles msi   # needs TAURI_SIGNING_PRIVATE_KEY(+_PASSWORD) env for updater artifacts
```

## Branches

- `main` / `v1`: v1.0.0 checkpoint (commit `63810dd`, roles/rules fix). The GitHub release `v1.0.0` MSI is older than this.
- `beta`: UI overhaul in progress. Don't push `v*` tags casually: `.github/workflows/release.yml` builds and drafts a release on any `v*` tag.

## Design system (beta)

- **Direction: clean & minimal** (chosen by the owner on 2026-10-14, replacing an earlier expressive ink/lime/serif pass). That means a white canvas, a light `sidebar` grey, hairline `line` borders, zinc neutrals and a **single indigo `accent`**. It is sans-only (Inter Variable, bundled via `@fontsource-variable/inter` for offline Tauri) and compact. Avoid dark blocks, gradients/glows, serif or display fonts, and big radii. `font-display` is just Inter semibold.
- Tokens live in `src/index.css` (`@theme`): `ink`, `canvas`, `sidebar`, `surface`, `surface-muted`, `line`, `line-strong`, `muted`, `faint`, `accent`, `accent-hover`, `accent-soft`, `accent-deep`. The radius tokens are overridden smaller, so `rounded-xl`/`2xl` stay tight.
- **Dark mode**:
  - `src/shared/theme.ts` (zustand) stores System / Light / Dark in localStorage (`aura-desk:theme`; absent means System). It is applied before the first render and sets `<html data-theme>`; System follows the OS live.
  - `index.css` overrides the same tokens under `:root[data-theme="dark"]`. It also remaps the Tailwind palette tints (`*-50/100/200` become translucent washes, `*-700/800` become `*-300`) for rose, emerald, amber, violet, sky, teal, orange, indigo and fuchsia. That makes status pills and alerts work without `dark:` classes. If you use a new hue for pastel UI, add it to that list.
  - Use `text-canvas` (not `text-white`) on `bg-ink`, and `bg-black/…` for backdrops.
  - The `dark:` variant follows `data-theme`.
  - The toggle is in the sidebar's account area.
- Density: 48px top bar, 220px sidebar, 13px body text, controls h-7/h-8, table rows about 44px. It must fit the 960px minimum window width.
- Primitives are in `src/shared/ui/primitives.tsx` (Button, IconButton, Input, Textarea, Select, Field, Badge, Card, Avatar, EmptyState, SegmentedControl, Modal with a `footer` prop for actions, Spinner, Kbd), exported through `src/shared/ui/index.ts`. Also there: `toast` + `<Toaster/>` and `confirmDialog()` + `<ConfirmHost/>`. Never use `alert()` or `window.confirm()`.
- Order status labels, colours, icons, "who acts next" and `needsAttentionFrom()` live in `src/shared/orderStatus.tsx`. Use `<StatusPill>`; don't hand-roll status badges.

## Demo mode (dev only)

`npm run dev`, then open `/?demo` (owner) or `/?demo=admin|sales_agent|designer|pending`. It shows sample data from `src/shared/demo.ts`, skips Firebase sign-in, and doesn't write to Firestore. A pill at the bottom switches roles. Everything is gated on `import.meta.env.DEV`; check the production bundle with `grep -l "auradesk.studio" dist/assets/*.js` (should find nothing).

## Layout

- `src/App.tsx` — auth gate: splash while `onAuthStateChanged` resolves → `AuthView` → `WaitingRoomView` (unassigned/pending) → `OrderDashboard`. Also creates/elevates the user profile doc.
- `src/features/auth/` — login/signup, Google loopback OAuth, Apple popup, password reset.
- `src/features/orders/` — dashboard, 5 views (`views/`), detail peek, modals, `LeftSidebar` (has "Check for Updates").
- `src/features/team/TeamGovernanceModal.tsx` — owner/admin user list, role select, approve, suspend, reset-password email.
- `src/features/layout/UpdateNotifier.tsx` — polls `@tauri-apps/plugin-updater` `check()` on start + every 15 min.
- `src/shared/` — `firebase.ts` (config with hardcoded fallbacks), `store.ts` (Zustand), `types/`.
- `src-tauri/` — plugins: single-instance, notification, clipboard, process, updater, oauth, opener, log. Updater pubkey + endpoint in `tauri.conf.json`; `aura.key.pub` committed, private key `*.key` gitignored.
- `firestore.rules` — role rules (`users`, `orders`, `invoices`, `order_snapshots`). Deploy with `firebase deploy --only firestore:rules`.
- `.github/workflows/release.yml` — on `v*` tag: tauri-action builds Windows, signs, creates a **draft** release.
- `cr/` — handoff notes from the previous agent (Antigravity). Paths there point at the old machine (`C:\Users\TheAuditLabs\...`) and are stale.

## History (previous agent, Oct 2026)

Built by an earlier coding agent on another machine. In order: rebrand to Aura Desk 1.0.0, single-instance fix (WebView2 `0x800700AA`), splash screen, owner auto-assign, Google/Apple buttons → `auth/popup-blocked` in WebView2 → `window.open` polyfill → "missing initial state" error → system-browser loopback OAuth (`tauri-plugin-oauth`) → still "keeps getting stuck". Updater was disabled after a `missing field pubkey` crash, then re-enabled with a generated keypair, but the user never saw an update prompt. The user finally signed in with email/password. **Unfinished request when that chat ended:** Team Governance still lists accounts the user deleted in the Firebase console; the user wants their owner account as the only owner to start from, so they can test multi-user roles cleanly.

Each fix was pushed by overwriting the same `v1.0.0` release instead of bumping the version. The user asked for that ("don't treat it as a different push"), but it is also why the updater never fires.

**Treat the previous agent's claims as unverified.** Several were false when checked on 2026-10-14 (below).

## Verified state vs. claims (2026-10-14)

| Claim | Actual |
|---|---|
| `latest.json` uploaded to release v1.0.0 | **No.** Release assets are only the `.msi` and `.msi.sig`. The repo-root `latest.json` is unused. |
| Release is the live update source | Release is marked **prerelease**. `/releases/latest/download/...` skips prereleases, so the updater endpoint 404s. |
| Release MSI is the newest build | The MSI asset was last uploaded 09:11Z. The repo `latest.json` `pub_date` is 14:11Z, so later builds never reached the release. |
| "100% clean builds" | (Fixed 2026-10-14 by adding the package at 2.1.0, matching the locked Rust crate.) Before that, **`npm run build` failed on a clean clone:** `TS2307: Cannot find module '@fabianlars/tauri-plugin-oauth'` (`AuthView.tsx:125`) plus `TS7006` at `:131`. The package is missing from package.json/lock, so the MSI cannot be rebuilt from this commit. |
| Google loopback OAuth works | Can't work as written even with the package installed (see Open problems 1). |
| Vitest invariants pass | The tests only exercise helper functions defined inside the test file, not app code. |

## Open problems (priority order)

1. **Google sign-in hangs.** `AuthView.tsx:148` uses the implicit flow (`response_type=id_token`). Google returns the token in the URL **fragment**, which browsers never send to the loopback server, so `onUrl` never sees `id_token` and the UI spins forever. The fix is the authorization-code + PKCE flow with a **Desktop** OAuth client, exchanging the code at `oauth2.googleapis.com/token`. Also: confirm the hardcoded `client_id` exists in GCP project 467381049765, add the plugin to `package.json`, and handle the "cancelled / never returned" case. Apple still uses `signInWithPopup` and will fail the same way in WebView2. Once loopback works, remove the `window.open` polyfill in `src/main.tsx`; it returns a fake window proxy and caused the "missing initial state" error.
2. ~~Stale users in Team Governance~~ **Fixed 2026-10-14 (uncommitted), needs rules deploy.** Shared `features/team/TeamMemberList.tsx` (used by the modal and the Team registry view) adds owner-only Remove and "Keep only me" (batch delete). Removed members are signed out via the profile listener in `App.tsx`. Deleting a user in the Firebase Auth console still does not touch Firestore; an `auth.user().onDelete` Cloud Function (Blaze plan) would automate it.
3. ~~Role sync is client-side only~~ **Fixed (same change).** Rules grant owner by `isOwnerEmail()` or an active `owner` doc; the `shahrukh` match is gone. `src/shared/userProfile.ts` `ensureUserProfile()` is the only place a profile is created, and the Firestore doc is the only source of role/status (no local fake-owner). `OWNER_EMAILS` there must match `isOwnerEmail()` in `firestore.rules`. The owner email bootstrap does not require `email_verified`.
4. ~~Privilege escalation~~ **Fixed (same change).** Self-create must be `unassigned/pending_approval` (owner email excepted); the owner fallbacks in `AuthView` are removed; self-updates cannot touch `role/status/uid/email/approved*`. Admins can only manage staff roles (`unassigned/sales_agent/designer`). Pending/suspended users get no role permissions in rules and see the waiting room.
5. **Designers and data rules.**
   - ~~Unfiltered orders query~~ Fixed: designers query `where('assigned_designer_id','==',uid)`.
   - Price/phone redaction is UI-only; designers can read those fields straight from Firestore.
   - `order_snapshots` is now active-members only, but designers can still read snapshot payloads that include prices.
   - `InvoicePanel.tsx` calls hooks conditionally (pre-existing oxlint errors).
6. **Updater pipeline.**
   - Version is still `1.0.0` everywhere. Every update needs a bump in `package.json`, `Cargo.toml` and `tauri.conf.json`, plus a new tag.
   - The release must be published (not draft or prerelease) and include `latest.json`. tauri-action generates it.
   - The **private signing key exists only on the old machine** (`src-tauri/aura.key` under `C:\Users\TheAuditLabs\...`). Without it, no update can be signed for already-installed copies; a new keypair means every user reinstalls the MSI once. The key must also be added as the `TAURI_SIGNING_PRIVATE_KEY` repo secret for CI.
   - Asset naming: the product name has a space (`Aura Desk_…`) but the uploaded asset is `AuraDesk_…`. Keep `latest.json` URLs consistent with what was actually uploaded.
7. **Hygiene.**
   - `.env` is tracked despite `.gitignore`. Firebase web config isn't secret, but untrack it.
   - `firebase.ts` hardcodes fallback config.
   - `capabilities/default.json` applies to `"windows": ["*"]`, including popup windows the polyfill creates.
   - CSP is `null`.

## Working notes

- The user tests in the installed desktop app (Windows), not the browser, so WebView2 behaviour matters.
- Firestore rules changes only take effect after `firebase deploy --only firestore:rules`. Check what is deployed before assuming.
- Don't create branches, commits, tags or releases unless asked. The local clone is the baseline.
