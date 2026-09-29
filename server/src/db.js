const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Direct PostgreSQL connection string
const DIRECT_PG_URL = 'postgresql://postgres:ANx79WCy9ACrGWYH@db.gzlklljypwetgafcdamz.supabase.co:5432/postgres';
// Fallback pooler URL for IPv4-only networks
const POOLER_FALLBACK_URL = 'postgresql://postgres.gzlklljypwetgafcdamz:ANx79WCy9ACrGWYH@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';

const PG_CONN_STRING = process.env.DATABASE_URL || DIRECT_PG_URL;

let pgPool = new Pool({
  connectionString: PG_CONN_STRING,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
});

let usingFallback = false;

async function executeQuery(text, params = []) {
  try {
    return await pgPool.query(text, params);
  } catch (err) {
    const isDnsError = 
      err.code === 'ENOTFOUND' || 
      err.code === 'ENOENT' || 
      (err.message && (err.message.includes('ENOTFOUND') || err.message.includes('ENOENT') || err.message.includes('getaddrinfo')));

    if (!usingFallback && isDnsError) {
      console.log('[PostgreSQL] Direct IPv6 address not resolvable on this network, switching to Supabase IPv4 pooler...');
      usingFallback = true;
      pgPool = new Pool({
        connectionString: POOLER_FALLBACK_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });
      return await pgPool.query(text, params);
    }
    throw err;
  }
}

// In-memory cache for ultra-fast sync
const memNotes = new Map();
const memUsers = new Map();

// Optional local SQLite support
let sqlite = null;
let stmts = null;
try {
  const Database = require('better-sqlite3');
  const DATA_DIR = path.join(__dirname, '../data');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const DB_PATH = path.join(DATA_DIR, 'notepad.db');
  sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  stmts = {
    getNote: sqlite.prepare('SELECT * FROM notes WHERE slug = ?'),
    insertNote: sqlite.prepare('INSERT INTO notes VALUES (@slug, @content, @password, @language, @ownerId, @createdAt, @updatedAt)'),
    updateNote: sqlite.prepare('UPDATE notes SET content=@content, password=@password, language=@language, ownerId=@ownerId, updatedAt=@updatedAt WHERE slug=@slug'),
  };
} catch (_) {}

async function initPgTables() {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS notes (
        slug TEXT PRIMARY KEY,
        content TEXT DEFAULT '',
        password TEXT DEFAULT NULL,
        language TEXT DEFAULT 'plaintext',
        owner_id TEXT DEFAULT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    console.log('[PostgreSQL] Connected and verified tables.');
  } catch (err) {
    console.warn('[PostgreSQL Init]:', err.message);
  }
}
initPgTables();

function mapRowToNote(row) {
  if (!row) return null;
  return {
    slug: row.slug,
    content: row.content || '',
    password: row.password || null,
    language: row.language || 'plaintext',
    ownerId: row.owner_id !== undefined ? row.owner_id : row.ownerId || null,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}


const db = {
  async getNote(slug) {
    if (memNotes.has(slug)) return memNotes.get(slug);

    try {
      const res = await executeQuery('SELECT * FROM notes WHERE slug = $1', [slug]);
      if (res.rows.length > 0) {
        const note = mapRowToNote(res.rows[0]);
        memNotes.set(slug, note);
        return note;
      }
    } catch (err) {
      console.warn('[PostgreSQL getNote]:', err.message);
    }

    if (stmts && stmts.getNote) {
      try {
        const local = stmts.getNote.get(slug);
        if (local) {
          memNotes.set(slug, local);
          return local;
        }
      } catch (_) {}
    }

    return null;
  },

  async getAllNotes() {
    const map = {};
    try {
      const res = await executeQuery('SELECT * FROM notes');
      for (const row of res.rows) {
        const note = mapRowToNote(row);
        map[note.slug] = note;
        memNotes.set(note.slug, note);
      }
    } catch (err) {
      console.warn('[PostgreSQL getAllNotes]:', err.message);
    }
    for (const [k, v] of memNotes.entries()) map[k] = v;
    return map;
  },

  async saveNote(slug, data = {}) {
    const existing = await this.getNote(slug);
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
    } else {
      note = {
        ...existing,
        content: data.content !== undefined ? data.content : existing.content,
        password: data.password !== undefined ? data.password : existing.password,
        language: data.language !== undefined ? data.language : existing.language,
        ownerId: data.ownerId !== undefined ? data.ownerId : existing.ownerId,
        updatedAt: data.updatedAt || now,
      };
    }

    memNotes.set(slug, note);

    try {
      await executeQuery(`
        INSERT INTO notes (slug, content, password, language, owner_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (slug)
        DO UPDATE SET
          content = EXCLUDED.content,
          password = EXCLUDED.password,
          language = EXCLUDED.language,
          owner_id = EXCLUDED.owner_id,
          updated_at = EXCLUDED.updated_at
      `, [note.slug, note.content, note.password, note.language, note.ownerId, note.createdAt, note.updatedAt]);
    } catch (err) {
      console.warn('[PostgreSQL saveNote]:', err.message);
    }

    if (stmts) {
      try {
        if (!existing) stmts.insertNote.run(note);
        else stmts.updateNote.run(note);
      } catch (_) {}
    }

    return note;
  },
  async changeSlug(oldSlug, newSlug) {
    const old = await this.getNote(oldSlug);
    if (!old) return { success: false, error: 'Ghi chú cũ không tồn tại' };

    const target = await this.getNote(newSlug);
    if (target) return { success: false, error: 'URL mới này đã được người khác sử dụng, vui lòng chọn tên khác' };

    const now = new Date().toISOString();
    const updated = { ...old, slug: newSlug, updatedAt: now };

    try {
      await executeQuery('UPDATE notes SET slug = $1, updated_at = $2 WHERE slug = $3', [newSlug, now, oldSlug]);
    } catch (err) {
      console.warn('[PostgreSQL changeSlug]:', err.message);
    }

    memNotes.delete(oldSlug);
    memNotes.set(newSlug, updated);
    return { success: true, note: updated };
  },

  async deleteNote(slug) {
    memNotes.delete(slug);
    try {
      await executeQuery('DELETE FROM notes WHERE slug = $1', [slug]);
      return true;
    } catch (err) {
      console.warn('[PostgreSQL deleteNote]:', err.message);
      return false;
    }
  },

  async getUserNotes(userId) {
    try {
      const res = await executeQuery('SELECT * FROM notes WHERE owner_id = $1 ORDER BY updated_at DESC', [userId]);
      const list = res.rows.map(mapRowToNote);
      for (const n of list) memNotes.set(n.slug, n);
      return list;
    } catch (err) {
      console.warn('[PostgreSQL getUserNotes]:', err.message);
      const list = [];
      for (const n of memNotes.values()) if (n.ownerId === userId) list.push(n);
      return list;
    }
  },

  async findUserByUsername(username) {
    if (!username) return null;
    for (const u of memUsers.values()) {
      if (u.username && u.username.toLowerCase() === username.toLowerCase()) return u;
    }
    try {
      const res = await executeQuery('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
      if (res.rows.length > 0) {
        const u = res.rows[0];
        memUsers.set(u.id, u);
        return u;
      }
    } catch (err) {
      console.warn('[PostgreSQL findUserByUsername]:', err.message);
    }
    return null;
  },

  async findUserByEmail(email) {
    if (!email) return null;
    for (const u of memUsers.values()) {
      if (u.email && u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    try {
      const res = await executeQuery('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (res.rows.length > 0) {
        const u = res.rows[0];
        memUsers.set(u.id, u);
        return u;
      }
    } catch (err) {
      console.warn('[PostgreSQL findUserByEmail]:', err.message);
    }
    return null;
  },

  async findUserById(id) {
    if (!id) return null;
    if (memUsers.has(id)) return memUsers.get(id);
    try {
      const res = await executeQuery('SELECT * FROM users WHERE id = $1', [id]);
      if (res.rows.length > 0) {
        const u = res.rows[0];
        memUsers.set(u.id, u);
        return u;
      }
    } catch (err) {
      console.warn('[PostgreSQL findUserById]:', err.message);
    }
    return null;
  },

  async createUser(user) {
    memUsers.set(user.id, user);
    try {
      await executeQuery(`
        INSERT INTO users (id, username, email, password, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          email = EXCLUDED.email,
          password = EXCLUDED.password
      `, [user.id, user.username, user.email, user.password, user.createdAt]);
    } catch (err) {
      console.warn('[PostgreSQL createUser]:', err.message);
    }
    return user;
  },
};

module.exports = db;
