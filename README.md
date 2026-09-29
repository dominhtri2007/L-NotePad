# L-NotePad 📝

> A modern, lightning-fast, real-time collaborative online notepad with instant sync, custom URLs, password protection, and multilingual support.

![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![Vite](https://img.shields.io/badge/Vite-5-purple.svg)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Supabase-336791.svg)
![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-black.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## ✨ Features

- ⚡ **Multi-Tier Real-Time Collaboration**:
  - **Zero-Latency Cross-Tab Sync**: Powered by the browser `BroadcastChannel` API for instantaneous (<5ms) keystroke mirroring across open tabs without network latency.
  - **Cross-Device Cloud Sync**: Real-time updates delivered via Supabase Realtime Channels, adaptive high-performance polling, and Socket.IO for connected devices.
- 🔗 **Customizable URLs / Slugs**: Access or share any note with a custom address (e.g., `/{custom-slug}`) with immediate live slug migration.
- 🔒 **Password Protection**: Lock private notes with bcrypt password hashing. Lock screen shields unauthorized access.
- 👁️ **Read-Only Share Mode**: Generate dedicated view-only links (`/share/{slug}`) that automatically update live without granting edit permissions.
- 🌐 **Multilingual (i18n)**: Full native localization support with persistent preferences and auto browser detection:
  - 🇺🇸 English (`en`)
  - 🇻🇳 Vietnamese (`vi`)
  - 🇨🇳 Chinese (`zh`)
  - 🇷🇺 Russian (`ru`)
- 💾 **Dual Database Architecture**: Direct PostgreSQL integration (Supabase Cloud Direct & Pooler) with seamless local SQLite3 fallback (`WAL` mode).
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
- **Realtime**: `BroadcastChannel` API + `supabase-js` + `socket.io-client`
- **Routing**: `react-router-dom`

### Backend (`/server` & `/api`)
- **Runtime**: Node.js & Express (supports both standalone server and Vercel Serverless Function via `api/index.js`)
- **Database**: PostgreSQL (Supabase Cloud) / SQLite3 via `better-sqlite3` (`WAL` journal mode)
- **Realtime Engine**: BroadcastChannel + HTTP Polling + Supabase Channels + Socket.IO
- **Auth & Security**: `jsonwebtoken` (JWT), `bcryptjs`, SVG Captcha

---

## 📁 Project Structure

```text
L-NotePad/
├── api/                    # Vercel Serverless Function entry point
│   └── index.js            # Express serverless bridge
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # UI components (Navbar, Toolbar, Editor, Modals)
│   │   ├── context/        # React contexts (LanguageContext, AuthContext)
│   │   ├── i18n/           # Internationalization dictionaries (en, vi, zh, ru)
│   │   ├── pages/          # NotePage, SharePage, MyNotesPage
│   │   ├── services/       # Supabase and API service clients
│   │   └── types/          # TypeScript definitions
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Express backend & database services
│   ├── src/
│   │   ├── routes/         # Auth and Notes REST API routes
│   │   ├── captcha.js      # SVG Captcha generation & verification
│   │   ├── db.js           # PostgreSQL & SQLite unified database layer
│   │   ├── app.js          # Express application setup
│   │   └── index.js        # Standalone server & Socket.IO entry point
│   ├── supabase_schema.sql # Supabase PostgreSQL schema & tables
│   └── package.json
├── vercel.json             # Vercel serverless routing & SPA rewrite configuration
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

## ⚡ Deployment on Vercel (100% Serverless)

This repository is optimized for deployment on [Vercel](https://vercel.com) as a full-stack serverless application:
- `vercel.json` routes `/api/*` requests to the serverless Express function in `api/index.js`.
- Frontend SPA routing rewrites all other routes to the compiled Vite bundle in `client/dist`.
- Built-in multi-layer synchronization (BroadcastChannel + polling fallback) ensures instant live updates across tabs and devices.

### Deployment Steps:
1. Push your repository to GitHub.
2. Go to the [Vercel Dashboard](https://vercel.com/new) and click **Import Project**.
3. Under **Environment Variables**, add:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string (e.g., `postgresql://postgres:[PASSWORD]@...`).
   - `JWT_SECRET`: A secret string used for signing user authentication tokens.
4. Click **Deploy**. Vercel will install dependencies, compile the frontend, and deploy the serverless API.

---

## 🗄️ Supabase Database Setup (Recommended for Cloud)

L-NotePad directly connects to Supabase Cloud PostgreSQL, eliminating the need for standalone backend servers:

### Step 1: Create a Supabase Project
1. Sign up or log in at [supabase.com](https://supabase.com).
2. Create a new project in your preferred region.
3. Navigate to the **SQL Editor** (`>_` icon on the left menu).
4. Copy the contents of `supabase_schema.sql` from this repository, paste into the SQL Editor, and click **Run** to set up tables and indexes.

### Step 2: Retrieve PostgreSQL Connection String
1. In your Supabase dashboard, go to **Project Settings** -> **Database**.
2. Copy the **Connection string** (URI format) and replace `[YOUR-PASSWORD]` with your database password.
3. Use the direct URL or session pooler URL for IPv4 compatibility.

### Step 3: Configure Environment Variables
- In local development: Add `DATABASE_URL` and `JWT_SECRET` to `.env` or `server/.env`.
- In Vercel: Add `DATABASE_URL` and `JWT_SECRET` under **Project Settings** -> **Environment Variables**.


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
