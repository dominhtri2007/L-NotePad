const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'notepad.db');
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
    return stmts.getNote.get(slug) || null;
  },
  getAllNotes() {
    const map = {};
    for (const r of stmts.getAllNotes.all()) map[r.slug] = r;
    return map;
  },
  saveNote(slug, data = {}) {
    const existing = stmts.getNote.get(slug);
    const now = new Date().toISOString();
    if (!existing) {
      const newNote = {
        slug,
        content: data.content !== undefined ? data.content : '',
        password: data.password !== undefined ? data.password : null,
        language: data.language !== undefined ? data.language : 'plaintext',
        ownerId: data.ownerId !== undefined ? data.ownerId : null,
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now,
      };
      stmts.insertNote.run(newNote);
      return newNote;
    }
    const updated = {
      slug,
      content: data.content !== undefined ? data.content : existing.content,
      password: data.password !== undefined ? data.password : existing.password,
      language: data.language !== undefined ? data.language : existing.language,
      ownerId: data.ownerId !== undefined ? data.ownerId : existing.ownerId,
      updatedAt: data.updatedAt || now,
    };
    stmts.updateNote.run(updated);
    return { ...existing, ...updated };
  },
  changeSlug(oldSlug, newSlug) {
    if (!stmts.getNote.get(oldSlug)) return { success: false, error: 'Ghi chú cũ không tồn tại' };
    if (stmts.getNote.get(newSlug)) return { success: false, error: 'URL mới này đã được người khác sử dụng, vui lòng chọn tên khác' };
    stmts.updateSlug.run(newSlug, new Date().toISOString(), oldSlug);
    return { success: true, note: stmts.getNote.get(newSlug) };
  },
  deleteNote(slug) {
    return stmts.deleteNote.run(slug).changes > 0;
  },
  getUserNotes(userId) {
    return stmts.getUserNotes.all(userId);
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
    stmts.insertUser.run(user);
    return user;
  },
  close() {
    sqlite.close();
  }
};

module.exports = db;
