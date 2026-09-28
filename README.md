# L-NotePad 📝

> A modern, lightning-fast, real-time collaborative online notepad with custom URLs, password protection, and multilingual support.

![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![Vite](https://img.shields.io/badge/Vite-5-purple.svg)
![SQLite](https://img.shields.io/badge/Database-SQLite3-lightgrey.svg)
![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-black.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## ✨ Features

- ⚡ **Real-time Collaboration**: Instant bidirectional synchronization across multiple devices and tabs using WebSocket (`Socket.IO`).
- 🔗 **Customizable URLs / Slugs**: Access or share any note with a custom address (e.g., `/{custom-slug}`) with immediate live slug migration.
- 🔒 **Password Protection**: Lock private notes with bcrypt password hashing. Lock screen shields unauthorized access.
- 👁️ **Read-Only Share Mode**: Generate dedicated view-only links (`/share/{slug}`) that automatically update live without granting edit permissions.
- 🌐 **Multilingual (i18n)**: Full native localization support with persistent preferences and auto browser detection:
  - 🇻🇳 Vietnamese (`vi`)
  - 🇺🇸 English (`en`)
  - 🇨🇳 Chinese (`zh`)
  - 🇷🇺 Russian (`ru`)
- 💾 **SQLite Storage**: Powered by `better-sqlite3` with Write-Ahead Logging (`WAL` mode) for maximum speed and data reliability.
- 📄 **Raw Text API**: Fetch plaintext content effortlessly via `/raw/:slug` (supports curl and script integrations).
- 👤 **User Accounts & Dashboard**:
  - Register & login secured with SVG Captcha validation.
  - "My Notes" dashboard with search, word counts, character counts, and quick access.
- 🌓 **Dark & Light Mode**: Seamless theme switching with high-contrast, modern UI.
- 📥 **Export**: Quick download to `.txt` files and one-click clipboard copying.

---

## 🏗️ Architecture & Tech Stack

### Frontend (`/client`)
- **Framework**: React 18 with TypeScript
- **Bundler & Tooling**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Realtime**: `socket.io-client`
- **Routing**: `react-router-dom`

### Backend (`/server`)
- **Runtime**: Node.js & Express
- **Database**: SQLite3 via `better-sqlite3` (`WAL` journal mode)
- **Realtime Engine**: `socket.io`
- **Auth & Security**: `jsonwebtoken` (JWT), `bcryptjs`

---

## 📁 Project Structure

```text
L-NotePad/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components (Navbar, Toolbar, Editor, Modals)
│   │   ├── context/        # React contexts (LanguageContext, AuthContext)
│   │   ├── i18n/           # Internationalization dictionaries (vi, en, zh, ru)
│   │   ├── pages/          # NotePage, SharePage, MyNotesPage
│   │   └── types/          # TypeScript definitions
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Express & Socket.IO backend
│   ├── src/
│   │   ├── routes/         # Auth and Notes API endpoints
│   │   ├── captcha.js      # Captcha generator & verification
│   │   ├── db.js           # SQLite database schema and operations
│   │   └── index.js        # Main server entry & socket handler
│   ├── data/               # SQLite database storage (notepad.db)
│   └── package.json
├── package.json            # Root workspace scripts
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0 or higher)
- [npm](https://www.npmjs.com/) (bundled with Node.js)

### 1. Clone the repository
```bash
git clone https://github.com/dominhtri2007/L-NotePad.git
cd L-NotePad
```

### 2. Install dependencies
Install dependencies for both frontend and backend in one command:
```bash
npm run install:all
```
*(Or install individually: `npm install`, `cd server && npm install`, `cd client && npm install`)*

### 3. Run development servers
Start both backend (port `5000`) and frontend (port `5173`) concurrently:
```bash
npm run dev
```

Visit **http://localhost:5173** in your browser.

---

## 🛠️ Available Scripts

From the root directory:

| Command | Description |
|---|---|
| `npm run dev` | Runs backend and frontend concurrently in development mode |
| `npm run dev:server` | Runs the Express backend server with auto-reload |
| `npm run dev:client` | Runs the Vite frontend development server |
| `npm run build` | Builds the client production bundle into `client/dist` |
| `npm run start` | Starts the production server |

---

---

## ⚡ Triển khai lên Vercel (Vercel Deployment)

Thư mục này đã được tối ưu sẵn 100% để deploy trực tiếp lên [Vercel](https://vercel.com):
- Đã có file cấu hình `vercel.json` định tuyến SPA rewrites và đường dẫn output `client/dist`.
- Lệnh build tự động cài đặt dependency của client và biên dịch Vite (`cd client && npm install && npm run build`).
- Tích hợp chế độ lưu trữ cục bộ (Offline / LocalStorage fallback) giúp ứng dụng hoạt động ngay trên Vercel kể cả khi chưa cấu hình backend server.

### Các bước Deploy lên Vercel:
1. Đẩy code lên GitHub.
2. Truy cập [Vercel Dashboard](https://vercel.com/new) -> **Import Git Repository**.
3. Vercel sẽ tự động phát hiện cấu hình từ file `vercel.json`. Bấm **Deploy**.
4. *(Tùy chọn - Kết nối Backend đầy đủ)*:
   - Nếu bạn deploy backend lên [Render.com](https://render.com) hoặc [Railway.app](https://railway.app):
   - Vào Vercel: **Settings** -> **Environment Variables** -> Thêm:
     - Key: `VITE_BACKEND_URL`
     - Value: `https://your-backend-service.onrender.com`
   - Bấm **Redeploy** để frontend kết nối realtime đồng bộ đám mây và database SQLite.


## 📡 API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/captcha` | Generates a new SVG captcha |
| `POST` | `/api/auth/register` | Registers a new user account |
| `POST` | `/api/auth/login` | Authenticates user and returns JWT token |
| `GET` | `/api/auth/me` | Fetches current user profile |
| `GET` | `/api/notes/my` | Retrieves all notes owned by current user |
| `GET` | `/api/note/:slug` | Retrieves note content or lock status |
| `POST` | `/api/note/:slug/verify` | Validates note password |
| `POST` | `/api/note/:slug/set-password` | Sets or removes password for a note |
| `POST` | `/api/note/:slug/change-slug` | Renames note URL / slug |
| `POST` | `/api/note/:slug/claim` | Associates note to authenticated user |
| `GET` | `/raw/:slug` | Returns plain text content of a note |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
