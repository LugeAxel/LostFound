# 🏫 QReturn Project Structure

Project ini terdiri dari dua bagian utama: **Frontend** (Tampilan) dan **Backend** (Database & Server).

---

## 📂 Folder Structure

- `src/`: Tempat kode **Frontend** (Vue.js).
  - `views/`: Berisi halaman-halaman (Login, Dashboard, Report).
  - `router/index.ts`: Mengatur jalur (URL) aplikasi. Jika kamu buka `localhost:5173/`, file ini yang menentukan halaman mana yang muncul.
- `backend/`: Tempat kode **Backend** (Node.js + MongoDB).
  - `server.js`: Otak dari database. Menghubungkan ke MongoDB Atlas dan menyediakan API.
  - `.env`: Berisi rahasia (seperti URL Database). **Jangan hapus file ini.**
- `package.json` (di root): Berisi daftar perintah untuk menjalankan aplikasi.

---

## 🚀 Cara Menjalankan Project

Sekarang lebih mudah! Kamu tidak perlu pindah-pindah folder. Cukup satu perintah di terminal:

```powershell
npm run dev
```

Perintah ini akan otomatis menjalankan:

1.  **Frontend** di `http://localhost:5173`
2.  **Backend** di `http://localhost:5000`

---

## ❓ Apa itu `src/router/index.ts`?

File ini adalah **Lampu Lalu Lintas** aplikasi kamu.

- Jika URL-nya `/`, dia akan memanggil `Login.vue`.
- Jika URL-nya `/dashboard`, dia akan memanggil `Dashboard.vue`.
- Jika URL-nya `/report`, dia akan memanggil `Report.vue`.

Saat kamu menjalankan `npm run dev`, Vite akan mengeksekusi `src/main.ts`, yang kemudian memuat `App.vue` dan `router/index.ts` untuk menampilkan halaman yang sesuai.

---

## 🛠 Troubleshooting Database (MongoDB Atlas)

Jika kamu melihat error `buffering timed out`, itu berarti **Server gagal terhubung ke MongoDB Atlas**.

1.  Pastikan internet kamu stabil.
2.  Pastikan IP Address kamu sudah di-whitelist di Dashboard MongoDB Atlas (Network Access -> Allow Access from Anywhere).
3.  Cek log di terminal setelah menjalankan `npm run dev`. Cari pesan: `✅ MongoDB Connected Successfully to Atlas`.
