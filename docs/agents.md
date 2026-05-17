# QReturn — Agent Guide

School Lost & Found System (SMKN 2 Depok). Vue 3 + TypeScript frontend, Express backend, Supabase (Postgres + Auth + Realtime).

---

## Quick Start

```bash
npm run dev          # starts both frontend (Vite :5173) + backend (Express :5005)
npm run type-check   # vue-tsc type check
```

---

## Project Structure

| Path | Purpose |
|------|---------|
| `src/views/*.vue` (13) | Pages — Dashboard, Report, MyReports, Search, ItemDetail, Claim, Scanner, Statistics, Tutorial, etc. |
| `src/components/*.vue` (7) | Shared — SideNav, TopNav, ItemCard, Footer, LocationPicker, Toast, Marquee |
| `src/composables/` (4) | `useAuth.ts`, `useNotifications.ts`, `useToast.ts`, `useCache.ts` |
| `src/router/index.ts` | 13 routes with `requiresAuth` guard |
| `src/i18n.ts` | EN/ID translations, `useI18n()` composable |
| `src/config/api.ts` | `API_URL`, `SOCKET_URL` from `VITE_API_URL` env |
| `backend/server.js` (1700 lines) | Express + Socket.IO, 25+ endpoints |
| `backend/middleware/` | `authMiddleware`, `upload` (multer→Cloudinary), `cache` |
| `supabase/migrations/` (4) | Schema: profiles, items, messages, complaints, notifications, ratings, counters |

---

## Key Patterns

### Auth
- JWT in `Authorization: Bearer <token>` header
- `authMiddleware` verifies via Supabase Admin API → sets `req.user.id`
- Backend uses `SUPABASE_SERVICE_ROLE_KEY` — **bypasses RLS**; all user scoping in WHERE clauses
- Frontend: `getAuthHeaders()` from `composables/useAuth.ts`

### Route Ordering (Critical)
Sub-routes of `/api/items/:id` must be declared **before** the generic `GET /api/items/:id` to avoid Express param capture:

```
/items/matches/:id        ← BEFORE
/items/claim-code/:code   ← BEFORE
/items/:id                ← LAST
```

Same for notifications: `DELETE /api/notifications` before `DELETE /api/notifications/:id`.

### Data Model (items table)
- `type`: `'found'` | `'lost'`
- `status`: `'Available'` | `'On Progress'` | `'Returned'`
- `category`: `'Electronics'` | `'Daily Use'` | `'Clothing'` | `'Books/Stationery'` | `'Others'`
- `area_category`: fixed list — Ruang Teori, Laboratorium, Masjid, Kantin, Koperasi, Bima, Yudhistira, Arjuna, Lapangan, Kantor, Parkir, Bengkel, Bangunan Kimia, Bangunan GP
- `location`: free-text (separate from area_category)
- `coordinates_lat/lng`: optional GPS
- `reporter` / `claimer`: FK to profiles

### Matching Algorithm (3-pass)
1. Same category + same area_category
2. Same category only (broader)
3. Text keyword match (name/description `ilike`)
- All 3 passes filter: `type='found'` AND `status IN ('Available','On Progress','Returned')`
- Scored by GPS proximity (`distance_meters`), `.slice(0, 5)` returned

### Backend-Side Matching on Report
When a user reports a lost item, `POST /api/items` auto-runs the same 3-pass matching and creates `'suggestion'` type notifications for both sides (with live notification via Socket.IO).

### Notifications (Realtime)
- `useNotifications` composable: Supabase `postgres_changes` subscription on `notifications` table
- Types: `message`, `claim`, `resolved`, `complaint`, `system`, `suggestion`

### Chat
- Socket.IO: `join-room` on item detail load, `send-message` → `POST /api/items/:id/chat` → server emits `new-message`
- Frontend `sendMessage` appends with dedup (not full replace) to avoid socket race overwrites

### Complaint
- Atomic `INSERT ... ON CONFLICT (item_id, user_id) DO NOTHING` — no race condition
- `hasFiledComplaint` ref set instantly on submit (hides button before server round-trip)

### ItemDetail.vue Specifics
- `itemId` is `computed(() => route.params.id as string)` — always use `.value`
- Has `watch(itemId, ...)` that re-fetches + re-initializes socket on route param change
- `initSocket()` extracted function, called from both `onMounted` and `watch`

### i18n
- `useI18n()` composable, keys like `'card.status.Available'`, `'myreports.suggestions_match'`
- `t(key)` returns key itself if not translated (safe fallback)

### Frontend Conventions
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Material Symbols (`material-symbols-outlined`)
- Dark mode: `dark` class on `<html>`, stored in localStorage
- All views: `<script setup lang="ts">` + `<template>`, no scoped CSS
- `useToast()` from composable for notifications

---

## Common Tasks

### Adding a new DB migration
1. Create `supabase/migrations/005_*.sql`
2. Apply via Supabase dashboard SQL editor
3. Update server.js if new columns need querying

### Adding a new API endpoint
1. Add route in `backend/server.js` (watch route ordering!)
2. Add `authMiddleware` unless it's auth/login
3. Use `supabase` client (service role) for all queries
4. Call `invalidateCache(pattern)` if mutating cached data

### Adding a new page
1. Create `src/views/NewPage.vue`
2. Add route in `src/router/index.ts` with `meta: { requiresAuth: true }`
3. Add i18n keys in `src/i18n.ts`

---

## Critical Gotchas
- **ItemDetail**: `itemId` is a `computed` — all script usages require `.value`
- **Socket auth fallback**: `socket.emit('join-user', ...)` needs to fallback to `session?.user?.id` when `user.value.id` is undefined
- **area_category vs location**: area_category is a fixed dropdown of school zones; location is a free-text field — keep them separate
- **Route ordering** (see above) — Express matches routes in declaration order

## When Designing UI/UX

Read `uiux.md` first.