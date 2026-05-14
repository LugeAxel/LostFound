# LostFound — Implementation Summary

## Security Hardening

### 🔴 Critical

**Socket.IO Authentication**
- Backend: JWT verification middleware on every socket connection (`io.use()`)
- `join-user` room: user can only join their own `user-{id}` room
- `join-item` room: user must be reporter or claimer of the item to join
- Frontend: passes `auth: { token }` in `io()` handshake

**Input Validation**
- `POST /api/items/:id/complaint` — `reason` validated (trim, 3-500 chars)
- `POST /api/items/:id/resolve` — `userId` validated as MongoId
- All `:id` route params validated with `express-validator` (`param('id').isMongoId()`)
- `POST /api/ratings` — added express-validator for rating + comment

**Rate Limiting**
- Heavy endpoint limiter on `GET /api/stats/detailed` (30 req / 15 min)
- Per-socket rate limiter for messages (20 / 10s)

### 🟠 High

**Data Exposure**
- Error messages: 10+ endpoints changed from `error.message` to generic messages
- Item list: trimmed via `select('-messages -complaints -claimPhoto -claimNotes -coordinates')`
- Health endpoint: no longer exposes MongoDB `readyState`
- PII: NISN and email masked in console logs

**Authentication Performance**
- Router guard: `/api/auth/me` only called on page reload, not SPA navigation

**QR Scanner Safety**
- try/catch around `new URL()` (was crashing on invalid URLs)
- Decoded text validated as MongoDB ObjectId before route push

### 🟡 Medium

**File Upload**
- MIME-type `fileFilter` added to Multer (only JPEG/PNG/WebP)

**TOCTOU Race Condition**
- `start-claim` uses atomic `findOneAndUpdate` instead of find-then-save

**CORS**
- Localhost dev origins filtered out when `NODE_ENV=production`

### 🟢 Low
- Removed duplicate mock notifications endpoint
- Offline detection banner added to App.vue

---

## Caching Strategy

### Server-Side (`backend/middleware/cache.js`)
- In-memory cache with TTL (uses `memory-cache`)
- Only caches 2xx responses

| Endpoint | TTL |
|----------|-----|
| `GET /api/stats` | 60s |
| `GET /api/stats/detailed` | 300s |
| `GET /api/ratings` | 300s |
| `GET /api/items?page=1&limit≤20` | 30s |

**Cache invalidation** on: new item, claim, start-claim, complaint, resolve, rating submit.

### Client-Side (`src/composables/useCache.ts`)
- In-memory Map with TTL expiry
- `get(key)`, `set(key, data, ttlMs)`, `invalidate(pattern?)`

### Axios Retry (`src/config/http.ts`)
- Centralized axios instance with auth interceptor
- One automatic retry on failure with 1s delay

---

## Database Performance

### New Compound Indexes
- `ItemSchema.index({ type: 1, status: 1 })`
- `ItemSchema.index({ type: 1, reportedAt: -1 })`
- `NotificationSchema.index({ user: 1, createdAt: -1 })`

---

## Files Changed

| File | Action |
|------|--------|
| `backend/server.js` | Modified — Socket.IO auth, validation, caching, indexes, rate limiting, error hiding, TOCTOU fix, PII redaction |
| `backend/middleware/cache.js` | **New** — in-memory cache middleware |
| `backend/middleware/upload.js` | Modified — MIME-type filter |
| `src/views/Claim.vue` | Modified — `GET /api/items` → `GET /api/items/:id` |
| `src/views/Scanner.vue` | Modified — try/catch URL, ObjectId validation |
| `src/views/ItemDetail.vue` | Modified — Socket.IO auth token |
| `src/components/TopNav.vue` | Modified — Socket.IO auth token |
| `src/router/index.ts` | Modified — skip `/api/auth/me` on SPA nav |
| `src/config/api.ts` | Modified — warning when VITE_API_URL unset |
| `src/config/http.ts` | **New** — axios instance with retry |
| `src/composables/useCache.ts` | **New** — client-side cache composable |
| `src/App.vue` | Modified — offline detection banner |
| `PLAN.md` | Updated with full security + caching plan |
| `SUMMARY.md` | **New** — this file |
