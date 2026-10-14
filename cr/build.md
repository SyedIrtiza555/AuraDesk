# Aura Desk - Technical Stack & Build Specifications

## Core Architecture
- **Desktop Shell:** Tauri v2 (Rust 1.98+, Windows WebView2)
- **Frontend Framework:** React 19 + TypeScript + Vite + Tailwind CSS v4
- **State Management:**
  - Cloud Firestore real-time snapshots (`onSnapshot`) with `persistentLocalCache` (offline-first IndexedDB).
  - Zustand for ephemeral UI states (drawer controls, modal targets, time machine scrubbing, search filters).
- **Security & Data Isolation:**
  - Role-based views: `owner`, `admin`, `sales_agent`, `designer`, `unassigned`.
  - Redaction: Designers are strictly prevented from viewing `client_phone`, `agreed_price`, or invoice ledgers.
- **Delivery Verification:**
  - WhatsApp Safety Gate requires deterministic code confirmation `<Designer>-<Prospect>-<Order>` before marking orders `delivered`.
- **Time Machine:**
  - Day-wise lazy snapshot explorer querying `order_snapshots`.
