<p align="center">
  <img src="public/logo.png" alt="QReturn Logo" width="96" />
</p>

<h1 align="center">QReturn</h1>

<p align="center">
  <strong>Lost & Found System for SMKN 2 Depok</strong><br>
  Reconnecting students with their belongings, one QR scan at a time.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vue_3-4FC08D?style=flat-square&logo=vue.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express_5-000000?style=flat-square&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB_Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socket.io&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript_6-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white" />
</p>

---

## Features

| Feature | Description |
|---------|-------------|
| **QR Authentication** | Login via student card QR scan (NISN-based) — no passwords required |
| **Email/Password Auth** | Fallback authentication method |
| **Item Reporting** | Report lost or found items with photos, location, and category |
| **Live GPS Location** | Pinpoint item location using device GPS with interactive Leaflet map |
| **Real-time Chat** | Built-in chat via Socket.IO for founders and claimers to coordinate |
| **QR Claim System** | Each found item generates a unique QR code; owners scan to verify |
| **Smart Notifications** | Real-time alerts for claims, messages, and status changes |
| **Verification Workflow** | Semi-manual verification — founder reviews and finalizes ownership |
| **Search & Filter** | Browse items by text, type (lost/found), and category |
| **Statistics Dashboard** | Visual charts for items per day, categories, and fun facts |
| **Dark Mode** | Full dark mode support with system-aware toggling |
| **i18n** | Indonesian and English language support |
| **Retention Policy** | Unclaimed items auto-deleted after 10 days; returned items after 2 |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vue 3 (Composition API, `<script setup>`), Vite 8, TypeScript 6 |
| **Styling** | Tailwind CSS v4 (CSS-based config, no PostCSS) |
| **Backend** | Node.js, Express 5, CommonJS |
| **Database** | MongoDB Atlas via Mongoose 9 |
| **Real-time** | Socket.IO 4 (JWT handshake, rate-limited) |
| **Auth** | JWT (24h expiry) |
| **QR** | `html5-qrcode` (scanner), `qrcode.vue` (generator) |
| **Maps** | Leaflet + OpenStreetMap tiles |
| **Uploads** | Cloudinary via multer-storage-cloudinary (5MB limit) |
| **Animations** | LottieFiles (`@lottiefiles/dotlottie-vue`) |

---

## 📁 Project Structure

```
QReturn/
├── src/                    # Frontend (Vue 3)
│   ├── views/              # Page components (12 routes)
│   ├── components/         # Reusable components
│   ├── router/index.ts     # Route definitions + auth guard
│   ├── config/http.ts      # Axios instance (15s timeout, retry)
│   └── i18n.ts             # Custom i18n (EN/ID)
├── backend/                # Backend (Express 5)
│   ├── server.js           # API routes, Socket.IO, cron jobs
│   ├── middleware/          # Auth, cache, upload middleware
│   └── config/             # Cloudinary config
├── public/                 # Static assets
├── .env                    # Environment variables
├── vite.config.ts
├── package.json
└── tsconfig*.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20.19 or >= 22.12
- **npm** >= 10
- **MongoDB Atlas** account (or local MongoDB instance)
- **Cloudinary** account (for image uploads)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/QReturn.git
cd QReturn

# Install all dependencies (root + backend)
npm install
cd backend && npm install && cd ..
```

### Configuration

Create a `.env` file in the root directory:

```env
PORT=5005
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/lostfound?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRES_IN=24h
VITE_API_URL=http://localhost:5005

# Cloudinary (optional — falls back to no image otherwise)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Development

```bash
# Runs frontend (:5173) + backend (:5005) concurrently
npm run dev
```

### Build for Production

```bash
npm run build
```

### Type-Check

```bash
npm run type-check
```

---

## 🧭 Routes

| Path | Page | Auth |
|------|------|------|
| `/` | Login | Guest only |
| `/dashboard` | Dashboard | Required |
| `/report` | Report Item | Required |
| `/my-reports` | My Reports | Required |
| `/search` | Search Items | Required |
| `/statistics` | Statistics | Required |
| `/scan` | QR Scanner | Required |
| `/claim/:id` | Claim Item | Required |
| `/item/:id` | Item Detail | Required |
| `/tutorial` | Tutorial | Required |
| `/developer` | Developer Page | Required |
| `/rating` | Rate App | Required |

---

## 🔐 API Overview

All endpoints (except auth) require a `Bearer` token in the `Authorization` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Email/password login |
| `POST` | `/api/auth/qr-login` | NISN-based QR login |
| `GET` | `/api/auth/me` | Verify token & get profile |
| `GET` | `/api/items` | List items (paginated, filterable) |
| `GET` | `/api/items/mine` | Current user's reports |
| `GET` | `/api/items/:id` | Single item details |
| `POST` | `/api/items` | Create a report |
| `POST` | `/api/items/:id/start-claim` | Initiate a claim |
| `POST` | `/api/items/:id/claim` | Submit verified claim |
| `POST` | `/api/items/:id/chat` | Send chat message |
| `POST` | `/api/items/:id/complaint` | File complaint |
| `GET` | `/api/stats` | Dashboard stats |
| `GET` | `/api/stats/detailed` | Detailed statistics |
| `POST` | `/api/ratings` | Submit rating |

---

## 📸 Preview

<p align="center">
  <img src="screen.png" alt="QReturn Screenshot" width="720" />
</p>

---

## 📄 License

This project is developed for **SMKN 2 Depok** educational purposes.

---

<p align="center">
  Built with ❤️ for the SMKN 2 Depok community
</p>
