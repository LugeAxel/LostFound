# QReturn — Security Hardening & Caching Plan

> **Status:** Features 1–7 (complaint, rating, stats, claimer reassign, mobile UI, i18n) are implemented but uncommitted.
> **Next phase:** Security fixes (critical → low) + caching strategy (server + client).

---

## 🔴 CRITICAL

### C1 — Socket.IO Authentication Bypass

**Problem:** Socket.IO connections pass no JWT token. Any client can join any `user-{id}` or `item-{id}` room and receive real-time chat messages / notifications.

**Backend** — `backend/server.js` (~line 1080)

- Add `io.use(authMiddleware)` that verifies JWT from `socket.handshake.auth.token`
- Validate `join-user`: only allow joining `user-${socket.user._id}`
- Validate `join-item`: check that socket user is reporter or claimer of that item

**Frontend** — `src/views/ItemDetail.vue`, `src/components/TopNav.vue`

- Pass `auth: { token }` in `io(URL, { auth: { token } })` options
- Handle token expiry / reconnect with fresh token

---

### C2 — Authentication & Authorization Logic Issues

**Problem 2a:** QR login (`POST /api/login`) trusts `{ nisn, nama }` from client with zero server-side QR verification. Anyone who knows another student's NISN can impersonate them.

**Backend** — `backend/server.js` (~line 288)

- Add QR signature verification (server-side HMAC or JWT signature on QR content)
- OR document as intentional (semi‑manual design) and add a warning log

**Problem 2b:** localStorage `user` object is used for frontend authz checks (`isFounder`, `isClaimer`, `hasComplained`). A user can edit localStorage to change `_id` and impersonate another user in the UI.

**Frontend** — `src/views/ItemDetail.vue`, `src/views/Dashboard.vue`, `src/components/TopNav.vue`

- Add a note that backend `req.user._id` is the authoritative check (frontend checks are only for UI rendering)
- OR store a read‑only derived user object (from `/api/auth/me`) instead of parsing raw localStorage

---

### C3 — Rate Limiting Gaps

**Backend** — `backend/server.js`

- Global rate limiter is 500 req / 15 min (~0.56 req/s) — acceptable
- Add per‑endpoint limiter for heavy endpoints:
  - `GET /api/stats/detailed` — max 30 req / 15 min
  - `POST /api/login` (QR) — max 10 req / 15 min per IP (prevent NISN brute force)

---

## 🟠 HIGH

### H1 — Input Validation Gaps

**Backend** — `backend/server.js`

| Endpoint                          | Missing Validation                                 | Fix                                             |
| --------------------------------- | -------------------------------------------------- | ----------------------------------------------- |
| `POST /api/items/:id/complaint`   | `reason` has no trim, no length, no required check | Add `.trim().notEmpty().isLength({ max: 500 })` |
| `POST /api/items/:id/resolve`     | `userId` not validated as ObjectId                 | Add `.isMongoId()`                              |
| `POST /api/items/:id/start-claim` | `claimNotes` no max length                         | Add `.isLength({ max: 1000 })`                  |
| All `/api/items/:id` routes       | `:id` never validated as ObjectId                  | Add `param('id').isMongoId()`                   |

---

### H2 — Data Over-Exposure

**Backend** — `backend/server.js`

- **Item list endpoint** (`GET /api/items`, ~line 496): returns `messages`, `complaints`, `claimPhoto`, `claimNotes`, `coordinates` — trim to only needed fields for list views
- **NISN exposure**: `nisn` is PII (national student ID). Evaluate if it needs to be in complaint user population and login response
- **Raw error messages**: 10+ endpoints return `error.message` to client → replace with generic message + log server-side

---

### H3 — Admin Role Exists but Unused

**Backend** — `backend/server.js`

- `UserSchema` has `role: ['student', 'admin']` but no admin routes or middleware exist
- Add `adminAuth` middleware stub
- Add basic admin endpoints: list users, delete items, view all complaints

**Frontend** — `src/views/AdminPanel.vue` (new)

- Basic admin dashboard (user list, item management)

---

### H4 — Performance: Expensive Endpoint + Redundant Calls

**Backend** — `backend/server.js`

- `GET /api/stats/detailed` loads ALL items into JS memory — add caching (see CACHE‑1)
- Add compound MongoDB indexes:
  - `{ type: 1, status: 1 }`
  - `{ type: 1, reportedAt: -1 }`
  - `{ user: 1, createdAt: -1 }` (for Notification queries)

**Frontend**

- `Claim.vue` fetches `GET /api/items` (all items) then client‑filters → change to `GET /api/items/:id`
- `router/index.ts` calls `GET /api/auth/me` on every SPA navigation → only verify on full page reload or token expiry
- `Dashboard.vue` re‑fetches stats + items on every mount — deduplicate with a shared state / composable

---

### H5 — QR Scanner Crash / Route Injection

**Frontend** — `src/views/Scanner.vue`

- `new URL(decodedText)` throws on invalid URLs → wrap in try/catch
- Fallback `router.push('/claim/' + decodedText)` can navigate to any internal route → validate decodedText is a valid MongoDB ObjectId before pushing

---

## 🟡 MEDIUM

### M1 — Server-Side Caching (CACHE‑1)

**New file** — `backend/middleware/cache.js`

- Simple in‑memory cache with TTL support (use `memory-cache` npm package)
- Cache key = `req.originalUrl`
- On cache hit → `res.json(cached)`
- On cache miss → intercept `res.json`, store result, set timer, then respond

**Backend** — `backend/server.js` — Apply cache middleware to:

| Endpoint                        | TTL  | Rationale         |
| ------------------------------- | ---- | ----------------- |
| `GET /api/stats`                | 60s  | Dashboard summary |
| `GET /api/stats/detailed`       | 300s | Heaviest endpoint |
| `GET /api/ratings`              | 300s | Changes rarely    |
| `GET /api/items?page=1&limit=6` | 30s  | Dashboard feed    |

**Cache invalidation** — Clear relevant keys on:

- `POST /api/items` (new item)
- `POST /api/items/:id/claim` / `:id/start-claim`
- `POST /api/ratings`
- `POST /api/items/:id/resolve`

---

### M2 — Client-Side Caching (CACHE‑2)

**Frontend** — `src/composables/useCache.ts` (new)

- Simple in‑memory Map with TTL for GET responses
- Axios interceptor: check cache before GET, store after GET
- Expose `invalidateCache(pattern)` for mutation callbacks

**Frontend** — Apply to:

- Dashboard stats (60s TTL)
- Ratings overview (300s TTL)
- Item list on search (30s TTL per page)

**Also:**

- Add axios retry interceptor (1 retry on 5xx / network error)
- Add `navigator.onLine` detection with user‑facing offline banner

---

### M3 — File Upload Hardening

**Backend** — `backend/middleware/upload.js`

- Add MIME‑type `fileFilter`: only allow `image/jpeg`, `image/png`, `image/webp`
- Add `maxCount: 1` for safety

**Backend** — `backend/server.js`

- Fix inconsistency: validator `imageUrl` maxLength is 3,000,000 but schema maxlength is 500
- Store `claimPhoto` URLs from Cloudinary only (don't accept arbitrary URL from client)

---

### M4 — WebSocket Rate Limiting

**Backend** — `backend/server.js` (~line 1080)

- Add per‑socket rate limiter (e.g., max 20 messages / 10s per socket)
- Prevent chat spam via Socket.IO

---

## 🟢 LOW

### L1 — General Hardening

| Item                                 | File                            | Fix                                                                 |
| ------------------------------------ | ------------------------------- | ------------------------------------------------------------------- |
| Dev CORS origins in production       | `backend/server.js:44`          | Filter out localhost origins when `NODE_ENV === 'production'`       |
| CSP for Cloudinary images            | `backend/server.js`             | Configure helmet CSP to allow `*.cloudinary.com`                    |
| DB health check leak                 | `backend/server.js:277`         | Remove `readyState` from health endpoint                            |
| PII in console logs                  | `backend/server.js:304,390,455` | Redact NISN, email in logs                                          |
| No `isValidObjectId` on `:id` params | Various routes                  | Add `mongoose.Types.ObjectId.isValid()` guard before `findById`     |
| CORS allows `null` origin            | `backend/server.js:52`          | Keep as intentional (Postman/mobile support) but document           |
| Claim race condition (TOCTOU)        | `backend/server.js:656`         | Use `findOneAndUpdate` with status filter instead of find‑then‑save |

---

### L2 — Static Assets & Headers

**Frontend** — Production build served via Express (or nginx):

```
Cache-Control: public, immutable, max-age=31536000  for /assets/*.hash.*
Cache-Control: public, max-age=86400                for /favicon.ico
Cache-Control: no-store                             for /api/*
```

---

### L3 — Admin Panel (Stretch)

- `src/views/AdminPanel.vue` — basic dashboard for moderators
- Routes: list & delete items, view users, resolve disputes
- Requires backend admin middleware

---

## Files Changed Summary

| File                           | Action                                                                                            | Priority          |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------- |
| `backend/server.js`            | Socket.IO auth, input validation, error hiding, data trimming, caching, indexes, admin middleware | 🔴 C1/C2/H1/H2/M1 |
| `backend/middleware/cache.js`  | **New** — in-memory cache middleware                                                              | 🟡 M1             |
| `backend/middleware/upload.js` | MIME-type fileFilter                                                                              | 🟡 M3             |
| `src/views/ItemDetail.vue`     | Socket.IO auth token, localStorage user hardening                                                 | 🔴 C1/C2          |
| `src/components/TopNav.vue`    | Socket.IO auth token                                                                              | 🔴 C1             |
| `src/views/Claim.vue`          | Fix endpoint from `/api/items` → `/api/items/:id`                                                 | 🟠 H4             |
| `src/views/Scanner.vue`        | try/catch URL parse, validate decoded text                                                        | 🟠 H5             |
| `src/router/index.ts`          | Remove redundant `/api/auth/me` on SPA nav                                                        | 🟠 H4             |
| `src/composables/useCache.ts`  | **New** — client-side cache composable                                                            | 🟡 M2             |
| `src/views/Dashboard.vue`      | Deduplicate fetch calls                                                                           | 🟠 H4             |
| `src/views/AdminPanel.vue`     | **New** — admin dashboard (stretch)                                                               | 🟢 L3             |
