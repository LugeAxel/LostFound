# AGENTS.md — LostFound

**School lost & found system — SMKN 2 Depok.** Vue 3 + Vite 8 + Tailwind v4 (CSS-based config) + TypeScript 6 frontend, Express 5 + Mongoose 9 + Socket.IO 4 + JWT backend, MongoDB Atlas.

## Developer Commands

| Command | What |
|---|---|
| `npm run dev` | Runs Vite frontend (`:5173`) + Express backend (`:5005`) via `concurrently` |
| `npm run type-check` | `vue-tsc --build` (only type-check; no linter or test framework configured) |
| `npm run build` | `run-p type-check "build-only"` — always type-check before building |

## Architecture

- **Monorepo-style**: root `package.json` (ESM, frontend) + `backend/package.json` (CommonJS, Express server).
- **Frontend entry**: `index.html` → `src/main.ts`. Dark mode class applied to `<html>` before Vue mounts.
- **Router**: `src/router/index.ts`, HTML5 history mode, auth guard reads `localStorage` token+user, validates via `GET /api/auth/me` only on full reload.
- **Auth**: QR scan (NISN-based) is primary; email/password fallback. JWT stored in `localStorage`.
- **i18n**: custom (not vue-i18n) via provide/inject; locale key `'locale'` in `localStorage`. Languages: `en`, `id`.
- **Dark mode**: `.dark` class on `<html>`; CSS custom properties in `:root` / `.dark`.
- **Socket.IO**: real-time chat + notifications, JWT auth on handshake, per-socket message rate limit (20/10s).
- **Image upload**: Cloudinary via multer-storage-cloudinary, max 5MB, JPEG/PNG/WebP.

## Key Files & Config

- `src/assets/main.css` — Tailwind v4 `@import "tailwindcss"` + `@theme` (no `tailwind.config.*` or `postcss.config.*`).
- `vite.config.ts` — `@tailwindcss/vite` plugin, `@` alias to `src/`.
- `backend/middleware/cache.js` — in-memory cache with `invalidateCache(pattern)` on writes.
- `backend/server.js` — Express + Socket.IO setup, cron job deletes old items hourly.
- `PLAN.md` — documented security issues (critical → low). `SUMMARY.md` — fixes already applied.

## Conventions

- **No ESLint, Prettier, or test framework** is installed. Only type-checking via `vue-tsc`.
- **Component style**: `<script setup lang="ts">` Composition API.
- **API client**: `src/config/http.ts` — Axios instance (15s timeout, Bearer token interceptor, single retry).
- **API base URL** comes from `VITE_API_URL` env var.
- **Server-side caching** caches 2xx GET responses for configurable TTL; invalidated on POST/PUT/DELETE.
- **View routes** (12): all under `requiresAuth` except `/` (login).

## When Designing UI/UX

Read `uiux.md` first.
