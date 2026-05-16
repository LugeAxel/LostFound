# QReturn Authentication Flow

## Overview

QReturn uses **Supabase Auth** as the primary authentication system, with two login methods:
1. **QR Code Scan** (NISN-based, for students with physical ID cards)
2. **Email/Password** (standard Supabase Auth)

Both flows ultimately produce a **Supabase session** (access token + refresh token) that is used for all subsequent API requests.

---

## 1. QR Code Login Flow

### Purpose
Students scan their physical ID card QR code to log in. The QR contains student data (name, NISN, NIS, jurusan, etc.) in a tab-separated format.

### Steps

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Frontend scans QR code using html5-qrcode library                        │
│ 2. Parses QR data: nama, nisn, nis, jurusan, ttl, agama, gender             │
│ 3. Sends POST /api/login with parsed data to Express backend                │
└──────────────────────────┬──────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. Backend checks if profile exists in Supabase (profiles table by NISN)    │
│                                                                             │
│    ┌─ IF NEW USER ─────────────────────────────────────────────────────┐    │
│    │ a. Generate email: nisn_{nisn}@qreturn.local                       │    │
│    │ b. Generate password: qr_{nisn}_{timestamp}                        │    │
│    │ c. Create Supabase Auth user via admin API (email_confirm: true)   │    │
│    │ d. Store password in user_metadata for future logins               │    │
│    │ e. Profile auto-created by DB trigger (handle_new_user)            │    │
│    └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│    ┌─ IF EXISTING USER ────────────────────────────────────────────────┐    │
│    │ a. Retrieve stored password from user_metadata                     │    │
│    │ b. If missing, regenerate using profile.created_at timestamp       │    │
│    └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│ 5. Sign in with email + password → get Supabase session                     │
│ 6. Return { success: true, token: session.access_token, user: {...} }       │
└──────────────────────────┬──────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 7. Frontend receives token + user data                                      │
│ 8. Stores in localStorage: token, user                                      │
│ 9. Redirects to /dashboard                                                  │
│ 10. Router guard validates session via /api/auth/me                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Points
- **No email verification required** for QR users (email_confirm: true via admin API)
- **Password is stored in user_metadata** so it can be reused for subsequent logins
- **Profile is auto-created** by the `handle_new_user` Supabase trigger on auth.users insert
- **Token is a Supabase access token** (JWT), not a custom JWT

---

## 2. Email/Password Login Flow

### Purpose
Standard email/password authentication with optional registration.

### Login Steps

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. User enters email + password in Login.vue email mode                     │
│ 2. Frontend calls supabase.auth.signInWithPassword() directly               │
│ 3. Supabase returns session (access_token + refresh_token)                  │
│ 4. Frontend fetches /api/auth/me to get full user profile                   │
│ 5. Stores token + user in localStorage                                      │
│ 6. Redirects to /dashboard                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Registration Steps

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. User enters name, email, password in Login.vue email mode (register)     │
│ 2. Frontend calls supabase.auth.signUp() with user_metadata: { nama }       │
│ 3. Supabase creates auth.users entry (email NOT confirmed)                  │
│ 4. Supabase sends confirmation email to user                                │
│ 5. Profile auto-created by DB trigger (handle_new_user)                     │
│ 6. If session returned (email auto-confirm enabled), redirect to dashboard  │
│ 7. If no session, redirect to /verify-email for confirmation                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Email Verification Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. User clicks confirmation link in email                                   │
│ 2. Supabase redirects to /verify-email#access_token=...&refresh_token=...   │
│ 3. Frontend parses URL hash, calls supabase.auth.setSession()               │
│ 4. Supabase validates tokens, marks email as confirmed                      │
│ 5. Frontend fetches /api/auth/me to get user profile                        │
│ 6. Stores token + user in localStorage                                      │
│ 7. Redirects to /dashboard                                                  │
│                                                                             │
│ If error:                                                                   │
│ - Shows error message with retry/resend option                              │
│ - Link may have expired or been used already                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Session Management

### How Tokens Work

| Component | Storage | Purpose |
|-----------|---------|---------|
| `access_token` | `localStorage.getItem('token')` | Bearer token for API requests, valid for 1 hour |
| `refresh_token` | Managed by Supabase client internally | Used to get new access_token when expired |
| `user` object | `localStorage.getItem('user')` | Cached user profile data (nama, nisn, role, etc.) |

### Auth Middleware (Backend)

Every protected API route uses `authMiddleware`:
1. Extracts Bearer token from `Authorization` header
2. Calls `supabase.auth.getUser(token)` to validate
3. Fetches user profile from `profiles` table
4. Attaches `req.user` (profile data) to request

### Router Guard (Frontend)

Every protected route uses `router.beforeEach`:
1. Calls `supabase.auth.getSession()` to check for active session
2. If no session → redirect to `/` (login)
3. If session exists but invalid → sign out, redirect to login
4. If valid → allow navigation

---

## 4. Security Considerations

### Row Level Security (RLS)
- All database tables have RLS policies enabled
- Users can only access their own data (notifications, ratings, etc.)
- Public read access for items and ratings
- Backend uses service role key to bypass RLS (already validated via authMiddleware)

### Rate Limiting
- Auth endpoints: 20 requests per 15 minutes
- Global API: 500 requests per 15 minutes
- Socket.IO: 20 messages per 10 seconds per socket

### Token Storage
- **Primary**: Supabase client manages session internally (access_token + refresh_token)
- **Secondary**: `localStorage` stores a cached copy of `token` and `user` for quick access
- **Auth headers**: All views use `getAuthHeaders()` from `src/composables/useAuth.ts` which calls `supabase.auth.getSession()`
- **HTTP interceptor**: `src/config/http.ts` automatically attaches Supabase session token to all Axios requests
- Supabase client handles token refresh automatically

### Logout Flow
1. User clicks logout button (SideNav or Login)
2. Calls `await supabase.auth.signOut()` — clears Supabase session server-side
3. Clears `localStorage` (`token`, `user`)
4. Redirects to `/` (login page)
5. Router guard detects no session → allows access to login page

---

## 5. Troubleshooting

### QR Login Fails
- Check backend logs for "QR Login Error"
- Verify Supabase service role key has admin permissions
- Ensure `handle_new_user` trigger exists in Supabase

### Email Verification Not Working
- Check Supabase dashboard → Auth → Email Templates
- Verify redirect URL is set to `http://localhost:5173/verify-email`
- Check browser console for token parsing errors

### Session Expired
- Supabase access tokens expire after 1 hour
- Client should auto-refresh via `supabase.auth.getSession()`
- If refresh fails, user must log in again
