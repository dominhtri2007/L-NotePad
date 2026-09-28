const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

// 1. PostgreSQL Database setup (Direct connection string)
const DEFAULT_PG_URL = 'postgresql://postgres.gzlklljypwetgafcdamz:ANx79WCy9ACrGWYH@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';
const PG_CONN_STRING = process.env.DATABASE_URL || DEFAULT_PG_URL;

let pgPool = null;
try {
  pgPool = new Pool({
    connectionString: PG_CONN_STRING,
    ssl: { rejectUnauthorized: false }
  });
  console.log('[Database] Configured PostgreSQL direct pool.');
} catch (e) {
  console.warn('[Database] PostgreSQL pool init failed:', e.message);
}

// 2. Supabase Cloud REST/Realtime setup (Optional)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gzlklljypwetgafcdamz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[Database] Connected to Supabase Cloud API:', SUPABASE_URL);
  } catch (err) {
    console.warn('[Database] Failed to init Supabase:', err.message);
  }
}

const memNotes = new Map();
const memUsers = new Map();

// Preload data from PostgreSQL
if (pgPool) {
  pgPool.query('SELECT * FROM notes').then((res) => {
    for (const row of res.rows) {
      memNotes.set(row.slug, {
        slug: row.slug,
        content: row.content || '',
        password: row.password || null,
        language: row.language || 'plaintext',
        ownerId: row.owner_id || null,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
      });
    }
    console.log(`[PostgreSQL] Preloaded ${res.rows.length} notes from database.`);
  }).catch((err) => {
    console.warn('[PostgreSQL Notes Preload]:', err.message);
  });

  pgPool.query('SELECT * FROM users').then((res) => {
    for (const row of res.rows) {
      memUsers.set(row.id, {
        id: row.id,
        username: row.username,
        email: row.email,
        password: row.password,
        createdAt: row.created_at || new Date().toISOString(),
      });
    }
    console.log(`[PostgreSQL] Preloaded ${res.rows.length} users from database.`);
  }).catch((err) => {
    console.warn('[PostgreSQL Users Preload]:', err.message);
  });
}

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'notepad.db');
const Database = require('better-sqlite3');
const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('foreign_keys = ON');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notes (
    slug TEXT PRIMARY KEY,
    content TEXT DEFAULT '',
    password TEXT DEFAULT NULL,
    language TEXT DEFAULT 'plaintext',
    ownerId TEXT DEFAULT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_notes_owner ON notes(ownerId);
`);

// Migration from legacy JSON if empty
try {
  const usersCount = sqlite.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const usersJsonPath = path.join(DATA_DIR, 'users.json');
  if (usersCount === 0 && fs.existsSync(usersJsonPath)) {
    const rawUsers = JSON.parse(fs.readFileSync(usersJsonPath, 'utf-8') || '[]');
    const ins = sqlite.prepare('INSERT OR IGNORE INTO users VALUES (@id, @username, @email, @password, @createdAt)');
    sqlite.transaction((list) => { for (const u of list) if (u.id && u.username) ins.run(u); })(rawUsers);
  }

  const notesCount = sqlite.prepare('SELECT COUNT(*) as count FROM notes').get().count;
  const notesJsonPath = path.join(DATA_DIR, 'notes.json');
  if (notesCount === 0 && fs.existsSync(notesJsonPath)) {
    const rawNotes = JSON.parse(fs.readFileSync(notesJsonPath, 'utf-8') || '{}');
    const ins = sqlite.prepare(`INSERT OR IGNORE INTO notes VALUES (@slug, @content, @password, @language, @ownerId, @createdAt, @updatedAt)`);
    sqlite.transaction((list) => {
      for (const n of list) {
        if (n.slug) {
          ins.run({
            slug: n.slug,
            content: n.content || '',
            password: n.password || null,
            language: n.language || 'plaintext',
            ownerId: n.ownerId || null,
            createdAt: n.createdAt || new Date().toISOString(),
            updatedAt: n.updatedAt || new Date().toISOString(),
          });
        }
      }
    })(Object.values(rawNotes));
  }
} catch (e) {
  console.warn('[SQLite] Migration:', e.message);
}

const stmts = {
  getNote: sqlite.prepare('SELECT * FROM notes WHERE slug = ?'),
  getAllNotes: sqlite.prepare('SELECT * FROM notes'),
  insertNote: sqlite.prepare(`
    INSERT INTO notes (slug, content, password, language, ownerId, createdAt, updatedAt)
    VALUES (@slug, @content, @password, @language, @ownerId, @createdAt, @updatedAt)
  `),
  updateNote: sqlite.prepare(`
    UPDATE notes SET content = @content, password = @password, language = @language, ownerId = @ownerId, updatedAt = @updatedAt
    WHERE slug = @slug
  `),
  updateSlug: sqlite.prepare('UPDATE notes SET slug = ?, updatedAt = ? WHERE slug = ?'),
  deleteNote: sqlite.prepare('DELETE FROM notes WHERE slug = ?'),
  getUserNotes: sqlite.prepare('SELECT * FROM notes WHERE ownerId = ? ORDER BY updatedAt DESC'),
  getUserByUsername: sqlite.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE'),
  getUserByEmail: sqlite.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE'),
  getUserById: sqlite.prepare('SELECT * FROM users WHERE id = ?'),
  insertUser: sqlite.prepare('INSERT INTO users VALUES (@id, @username, @email, @password, @createdAt)'),
};


const db = {
  getNote(slug) {
    if (memNotes.has(slug)) return memNotes.get(slug);
    return stmts.getNote.get(slug) || null;
  },
  getAllNotes() {
    const map = {};
    for (const r of stmts.getAllNotes.all()) map[r.slug] = r;
    for (const [k, v] of memNotes.entries()) map[k] = v;
    return map;
  },
  saveNote(slug, data = {}) {
    const existing = this.getNote(slug);
    const now = new Date().toISOString();
    let note;
    if (!existing) {
      note = {
        slug,
        content: data.content !== undefined ? data.content : '',
        password: data.password !== undefined ? data.password : null,
        language: data.language !== undefined ? data.language : 'plaintext',
        ownerId: data.ownerId !== undefined ? data.ownerId : null,
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now,
      };
      try { stmts.insertNote.run(note); } catch (e) {}
    } else {
      note = {
        ...existing,
        content: data.content !== undefined ? data.content : existing.content,
        password: data.password !== undefined ? data.password : existing.password,
        language: data.language !== undefined ? data.language : existing.language,
        ownerId: data.ownerId !== undefined ? data.ownerId : existing.ownerId,
        updatedAt: data.updatedAt || now,
      };
      try { stmts.updateNote.run(note); } catch (e) {}
    }

    memNotes.set(slug, note);

    if (pgPool) {
      pgPool.query(`
        INSERT INTO notes (slug, content, password, language, owner_id, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (slug)
        DO UPDATE SET
          content = EXCLUDED.content,
          password = EXCLUDED.password,
          language = EXCLUDED.language,
          owner_id = EXCLUDED.owner_id,
          updated_at = EXCLUDED.updated_at
      `, [note.slug, note.content, note.password, note.language, note.ownerId, note.updatedAt])
      .catch(err => console.warn('[PostgreSQL Save Error]:', err.message));
    }

    if (supabase) {
      supabase.from('notes').upsert({
        slug: note.slug,
        content: note.content,
        password: note.password,
        language: note.language,
        owner_id: note.ownerId,
        updated_at: note.updatedAt,
      }, { onConflict: 'slug' }).then(({ error }) => {
        if (error) console.warn('[Supabase Sync Error]:', error.message);
      });
    }

    return note;
  },
  changeSlug(oldSlug, newSlug) {
    const old = this.getNote(oldSlug);
    if (!old) return { success: false, error: 'Ghi chú cũ không tồn tại' };
    if (this.getNote(newSlug)) return { success: false, error: 'URL mới này đã được người khác sử dụng, vui lòng chọn tên khác' };
    
    const now = new Date().toISOString();
    const updated = { ...old, slug: newSlug, updatedAt: now };
    
    try { stmts.updateSlug.run(newSlug, now, oldSlug); } catch (e) {}
    memNotes.delete(oldSlug);
    memNotes.set(newSlug, updated);

    if (pgPool) {
      pgPool.query('UPDATE notes SET slug = $1, updated_at = $2 WHERE slug = $3', [newSlug, now, oldSlug])
        .catch(err => console.warn('[PostgreSQL ChangeSlug Error]:', err.message));
    }

    if (supabase) {
      supabase.from('notes').delete().eq('slug', oldSlug).then(() => {
        supabase.from('notes').upsert({
          slug: updated.slug,
          content: updated.content,
          password: updated.password,
          language: updated.language,
          owner_id: updated.ownerId,
          updated_at: updated.updatedAt,
        });
      });
    }

    return { success: true, note: updated };
  },
  deleteNote(slug) {
    memNotes.delete(slug);
    if (pgPool) {
      pgPool.query('DELETE FROM notes WHERE slug = $1', [slug])
        .catch(err => console.warn('[PostgreSQL Delete Error]:', err.message));
    }
    if (supabase) supabase.from('notes').delete().eq('slug', slug);
    return stmts.deleteNote.run(slug).changes > 0;
  },
  getUserNotes(userId) {
    if (stmts) {
      try { return stmts.getUserNotes.all(userId); } catch (e) {}
    }
    const list = [];
    for (const n of memNotes.values()) if (n.ownerId === userId) list.push(n);
    return list;
  },
  findUserByUsername(username) {
    return username ? stmts.getUserByUsername.get(username) || null : null;
  },
  findUserByEmail(email) {
    return email ? stmts.getUserByEmail.get(email) || null : null;
  },
  findUserById(id) {
    return id ? stmts.getUserById.get(id) || null : null;
  },
  createUser(user) {
    memUsers.set(user.id, user);
    try { stmts.insertUser.run(user); } catch (e) {}

    if (pgPool) {
      pgPool.query(`
        INSERT INTO users (id, username, email, password, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          email = EXCLUDED.email,
          password = EXCLUDED.password
      `, [user.id, user.username, user.email, user.password, user.createdAt])
      .catch(err => console.warn('[PostgreSQL CreateUser Error]:', err.message));
    }

    if (supabase) {
      supabase.from('users').upsert({
        id: user.id,
        username: user.username,
        email: user.email,
        password: user.password,
        created_at: user.createdAt,
      }).then(({ error }) => {
        if (error) console.warn('[Supabase User Sync Error]:', error.message);
      });
    }
    return user;
  },
  close() {
    sqlite.close();
  }
};

module.exports = db;
