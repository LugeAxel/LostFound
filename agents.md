# AGENTS.md

## Project Name
LostFound

## Project Overview
LostFound adalah website lost & found berbasis sekolah yang membantu siswa SMKN 2 Depok melaporkan, menemukan, dan mengembalikan barang hilang dengan sistem QR Code dan verifikasi semi-manual.

Project ini berfokus pada:
- usability,
- kemudahan penggunaan,
- identitas siswa,
- dan fasilitasi pertemuan antara finder dan owner.

Project ini TIDAK bertujuan menjadi sistem keamanan enterprise atau fully automated ownership verification.

---

# Main Goals

## Core Objectives
1. Membantu siswa melaporkan barang hilang.
2. Membantu finder menghubungi pemilik barang.
3. Mempermudah proses claim barang.
4. Mengurangi kehilangan barang di lingkungan sekolah.
5. Membuat proses lost & found lebih terorganisir.

---

# Core System Concept

## Authentication
Authentication menggunakan QR Code kartu siswa sekolah.

QR siswa digunakan untuk:
- identifikasi siswa,
- login cepat,
- validasi owner.

QR TIDAK digunakan sebagai:
- bukti kepemilikan barang,
- sistem keamanan utama.

---

# Claim Verification Philosophy

Project menggunakan:
```txt
Semi-Manual Verification
