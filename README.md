# Aura Desk

The order desk for a jewelry CAD design studio. Sales agents log client requests, admins assign them to designers, designers build and deliver the CAD, and everyone sees what is waiting on them.

Windows desktop app (Tauri v2 + React 19 + Firebase). Current version: **1.1.0**.

---

## For the team

### Install

1. Download the latest `.msi` installer from [Releases](https://github.com/SyedIrtiza555/AuraDesk/releases/latest).
2. Run it and open **Aura Desk** from the Start menu.
3. After that the app updates itself. When a new version is out you'll see **Update and restart** in the bottom-right corner.

### Sign in

- Use **Continue with Google**, or an email and password (**Create an account** the first time).
- New accounts wait on an approval screen until an owner or admin gives them a role. The screen opens your workspace by itself once you're approved.

### Roles

| Role | Can do |
|---|---|
| **Owner** | Everything, including approving people, changing any role and removing members. |
| **Admin** | Assign designers, review designs, close orders, mark invoices paid, approve sales agents and designers. |
| **Sales agent** | Create orders, clarify details with clients when an order is sent back. |
| **Designer** | Work on orders assigned to them. Prices and client phone numbers are hidden. |

### How an order moves

`New intake` → (admin assigns a designer) → `Assigned` → `In production` → `In review` → `Delivered` → `Completed`

- An admin can send a new intake **back to the agent** if details are missing ("Needs info").
- In review, an admin either **approves** the design or **requests changes** ("Revision").
- Delivery needs the WhatsApp delivery code to be typed back, so nothing is marked delivered by accident.

**Needs you** (top-left of Orders, and the dot next to an order number) shows what is waiting on *you*. You also get a desktop notification when something new lands on you.

### Handy shortcuts

| Keys | Action |
|---|---|
| `Ctrl` `K` | Search orders |
| `Ctrl` `N` | New order (agents and admins) |
| `↑` `↓` | Move through orders in List view |
| `Esc` | Close the order panel or a dialog |

The theme button next to **Sign out** switches between Light, Dark and Match system.

---

## For the owner (one-time setup)

1. **Firestore rules**: after pulling a new version, publish the rules:
   ```bash
   npx.cmd firebase-tools deploy --only firestore:rules
   ```
2. **Google sign-in in the desktop app**: create a Google OAuth client of type *Desktop app* and add its ID/secret as GitHub secrets. See *Google sign-in setup* in [CLAUDE.md](CLAUDE.md).
3. **Release signing**: the updater only installs builds signed with the key whose public half is in `src-tauri/tauri.conf.json`. Add the private key as GitHub secrets `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

## Releasing a new version

1. Bump the version in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`.
2. Merge to `main` and push.
3. On GitHub, open **Actions → Release Tauri Desktop → Run workflow**, or push a tag `vX.Y.Z`. This builds and signs the MSI and creates a **draft** release with `latest.json`.
4. Install the draft's MSI on one machine and check it. Then click **Publish release**. Installed apps pick the update up within 15 minutes, or straight away via **Check for updates**.

---

## Development

```bash
npm ci
npm run dev          # web preview on http://localhost:5173
npx tauri dev        # desktop window (needs Rust + WebView2)
npm run lint
npx tsc -b
npx vitest run
```

- **Demo mode** (dev only): open `http://localhost:5173/?demo` to see the app with sample orders and a role switcher, without signing in or touching Firestore.
- Design tokens are in `src/index.css`. UI primitives are in `src/shared/ui`. Order status logic is in `src/shared/orderStatus.tsx`.
- Project notes, known issues and decisions are in [CLAUDE.md](CLAUDE.md).

## Known limitations

- Price and phone hiding for designers happens in the app. The data still sits in the same Firestore document, so a technical user with database access could read it.
- Apple sign-in works in a browser only, not in the desktop app.

Proprietary © Aura Desk. All rights reserved.
