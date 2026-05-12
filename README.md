# 🕵️‍♂️ LostFound - SMKN 2 Depok Edition

![LostFound Hero](/absolute/path/to/lostfound_hero_image_1778603999274.png)

### **Reconnecting students with their belongings, one QR scan at a time.**

**LostFound** is a modern, real-time lost and found platform specifically designed for the **SMKN 2 Depok** community. Built with a focus on usability and security, it bridges the gap between those who find lost items and those who are looking for them.

---

## 🌟 Key Features

### 📱 **QR-First Experience**
No more tedious login forms. Simply scan your **Student Card QR** to instantly log in and start reporting or claiming items.

### 📍 **GPS Location Pinpointing**
Finders can drop a precise pin on our **Interactive Leaflet Map**. Owners can see exactly where their item was last spotted, making recovery easier than ever.

### 💬 **Real-time Secure Chat**
Powered by **Socket.io**, our built-in chat system allows founders and claimers to communicate instantly without sharing personal phone numbers. 

### 🔔 **Smart Notification System**
Get alerted the moment someone claims your reported item or sends you a message. Our notification badge keeps you updated in real-time.

### 🛡️ **Verified Claim Workflow**
Items are protected by a **Semi-manual Verification** system. Founders review claims and finalize ownership only after seeing the "Claim QR Code" provided by the owner.

---

## 🛠️ Technology Stack

| Frontend | Backend | Database | Real-time |
| :--- | :--- | :--- | :--- |
| **Vue 3** (Composition API) | **Node.js** (Express) | **MongoDB Atlas** | **Socket.io** |
| **Vite** (Build Tool) | **JWT** (Auth) | **Mongoose** (ODM) | **Vercel/Local** |
| **Tailwind CSS** (Styling) | **Express Validator** | **Managed Cloud** | **WebSockets** |

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/LostFound.git
cd LostFound
```

### 2️⃣ Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3️⃣ Configure Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5005
MONGODB_URI=your_mongodb_atlas_uri
VITE_API_URL=http://localhost:5005
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=24h
```

### 4️⃣ Launch the Application
```bash
# Run both frontend and backend concurrently
npm run dev
```

---

## 📸 Preview

<div align="center">
  <img src="https://img.shields.io/badge/Status-Live-success?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Security-JWT%20Protected-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/UI/UX-Premium%20Design-orange?style=for-the-badge" />
</div>

---

## 📜 Development Philosophy
This project was built to prioritize **Usability**, **Student Identity**, and **Safety**. It’s not just a database; it’s a tool for community cooperation within SMKN 2 Depok.

---

Developed with ❤️ for **SMKN 2 Depok Students**.
