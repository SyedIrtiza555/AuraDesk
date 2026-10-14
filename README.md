# Aura Desk (v1.0.0)

> High-performance, role-based desktop order management & agency workflow workstation built with **Tauri v2**, **React 19**, **TypeScript**, **Tailwind CSS v4**, and **Google Cloud Firestore**.

---

## 🌟 Overview

**Aura Desk** is an agency management solution designed for real-time order lifecycle tracking, cross-functional team coordination, and verifiable client deliverables. It delivers native Windows desktop performance via Rust & WebView2 with offline-resilient local caching.

### 🛡️ Core Capabilities

- **Role-Based Workspaces & Access Control:**
  - **Owner / Admin:** Complete oversight, user onboarding, role promotions, and financial ledger visibility.
  - **Sales Agent:** Order creation, client intake, timeline monitoring, and delivery tracking.
  - **Designer:** Focused production view with automatic redaction of sensitive financials and client contact details.
  - **Unassigned / Pending:** Secure quarantine waiting room pending admin authorization.

- **Dynamic Multi-View Data Engine:**
  - **Dense Spreadsheet Table:** Multi-column sorting, sticky headers, and quick-inspect peek drawers.
  - **Kanban Lifecycle View:** Progression columns from `SUBMITTED_TO_ADMIN` through `IN_PRODUCTION`, `ADMIN_REVIEW`, to `COMPLETED`.
  - **Kanban Resource View:** Workload swimlanes partitioned by Designer and Sales Agent.
  - **Visual Cards Grid:** Card overview with project excerpts and avatar indicators.
  - **Interactive Calendar & Time Machine:** Forward-looking delivery schedules and historical milestone scrubbing.

- **Verification & Security:**
  - **WhatsApp Safety Gate:** Requires deterministic `<Designer>-<Prospect>-<Order>` code confirmation before orders can be marked delivered.
  - **Team Governance Console:** Direct in-app role assignment, approval workflows, and password reset email dispatches.
  - **Single-Instance Enforcement:** Prevents conflicting concurrent processes and ensures reliable window focus.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Desktop Shell** | Tauri v2 (Rust 1.90+, Windows WebView2) |
| **Frontend Framework** | React 19 + TypeScript + Vite |
| **Styling** | Tailwind CSS v4 + Radix UI Primitives |
| **Icons** | Lucide React |
| **Database & Auth** | Google Cloud Firebase (Firestore + Firebase Auth) |
| **Local Cache** | IndexedDB via Firestore `persistentLocalCache` |
| **State Management** | Zustand (ephemeral UI state) + Firestore real-time listeners |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Rust & Cargo](https://rustup.rs/) (v1.90+ recommended)
- [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (preinstalled on Windows 10/11)

### Installation

```bash
# Clone the repository
git clone https://github.com/SyedIrtiza555/AuraDesk.git
cd AuraDesk

# Install dependencies
npm install
```

### Development Mode

```bash
# Run with live browser HMR
npm run dev

# Or launch as desktop app in development
npx tauri dev
```

### Production Build

```bash
# Build desktop bundles (MSI, NSIS, standalone exe)
npx tauri build
```

The resulting installers and binaries will be generated inside `src-tauri/target/release/bundle/`.

---

## 🔐 Configuration & Firebase Setup

Configure your Google Cloud Firebase settings in `.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 📄 License

Proprietary © Aura Desk. All rights reserved.
