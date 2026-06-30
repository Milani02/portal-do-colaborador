# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server at http://localhost:5173
npm run build    # Production build → dist/
npm run lint     # ESLint (JS + JSX)
npm run preview  # Serve the production build locally
```

No test suite is configured.

## Environment Setup

Copy `.env.example` to `.env` and fill in the Supabase credentials. The app throws at startup if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are missing.

## Architecture

### Routing & Role System

Four roles drive the entire app: `admin`, `rh`, `gestor`, `colaborador`. After login, `login.jsx` reads the user's `cargo` from the `profiles` table and redirects:

| Route | Dashboard | Guard |
|---|---|---|
| `/admin` | `AdminDashboard` | `useAuthGuard('admin')` |
| `/rh` | `RhDashboard` | `useAuthGuard('rh')` |
| `/gestor` | `GestorDashboard` | `useAuthGuard('gestor')` |
| `/colaborador` | `ColaboradorDashboard` | `useAuthGuard(null)` |
| `/ouvidoria` | `Ouvidoria` | `useAuthGuard(null)` — **not yet wired in App.jsx** |

`src/hooks/useAuthGuard.js` reads the Supabase session from localStorage (zero network call), fetches the `profiles` row, then redirects to the correct route if the user's cargo doesn't match `requiredCargo`. Returns `{ perfil, loading, logout }`.

### Database Tables (Supabase Postgres)

- **`profiles`** — `id` (FK → auth.users), `nome_completo`, `cargo`, `setor`
- **`ocorrencias`** — `id`, `colaborador_id`, `setor`, `tipo`, `data_hora`, `motivo`, `status_gestor` (pendente/aprovado/reprovado), `acao_gestor` (abonar/descontar), `observacao_gestor`, `gestor_id`, `status_rh` (pendente/recebido), `observacao_rh`, `rh_id`, `created_at`
- **`ouvidoria`** — `sugestao` text only (no user ID in the insert — anonymous by design)

### Occurrence Lifecycle

```
Colaborador submits → status_gestor: pendente
Gestor approves/rejects → status_gestor: aprovado|reprovado + acao_gestor (abonar|descontar)
  Gestor can re-edit while status_rh is still 'pendente'
RH confirms receipt → status_rh: recebido
  Locks gestor edits permanently
```

### Real-time Updates

All three dashboards (Colaborador, Gestor, RH) subscribe to Supabase Realtime on `ocorrencias` and re-run their full fetch on any event. Channels are named `colab-ocos-{id}`, `gestor-ocos-{id}`, `rh-ocos-{id}`. Cleaned up in `useEffect` return via `supabase.removeChannel()`.

### Toast System

`src/utils/toast.js` fires a `portal-toast` CustomEvent on `window`. The `<Toaster>` in `App.jsx` listens and renders animated toasts (max 5, 4.2 s TTL). Call `toast(message, 'success' | 'error' | 'info')` from anywhere.

### Shared Utilities

- `src/utils/constants.js` — `cargoToRoute` map (single source of truth for role→route mapping)
- `src/utils/string.js` — `getInitials(nome)` for generating avatar initials
- `src/utils/validation.js` — `VALID_CARGOS`, `VALID_TIPOS_OCORRENCIA`, and validators for each field
- `src/utils/dateUtils.js` — `relativeDate`, `exactDatetime`, `shortDate` (all pt-BR locale)
- `src/utils/animations.js` — shared Framer Motion `containerVariants`, `itemVariants`, `itemVariantsLight` (alias) presets

### Build Chunking

`vite.config.js` splits bundles manually: `supabase`, `motion` (framer-motion), `pdf` (jspdf), `vendor` (react). Security headers in `vite.config.js` apply to the **dev server only** — production deployment must set them at the server/CDN level.
