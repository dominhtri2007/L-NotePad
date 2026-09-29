const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'live-notepad-secret-key-2026';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use((req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) req.user = user;
    next();
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/note', notesRoutes);
app.use('/api/notes', notesRoutes);

// Change Slug API
app.post('/api/note/:slug/change-slug', async (req, res) => {
  const { slug } = req.params;
  const { newSlug, currentPassword } = req.body;

  if (!newSlug || !/^[a-zA-Z0-9_-]+$/.test(newSlug)) {
    return res.status(400).json({ error: 'URL mới chỉ được chứa chữ cái, số, gạch ngang và gạch dưới' });
  }

  const note = await db.getNote(slug);
  if (note && note.password) {
    const isOwner = req.user && note.ownerId === req.user.id;
    if (!isOwner) {
      const isValid = await bcrypt.compare(currentPassword || '', note.password);
      if (!isValid) return res.status(403).json({ error: 'Mật khẩu hiện tại không đúng' });
    }
  }

  const result = await db.changeSlug(slug, newSlug);
  if (!result.success) return res.status(400).json({ error: result.error });

  if (app.get('io')) {
    app.get('io').to(`note:${slug}`).emit('slug-changed', { newSlug });
  }
  res.json({ success: true, newSlug, message: 'Đã đổi URL thành công!' });
});

// RAW Endpoint (Plaintext view)
app.get('/raw/:slug', async (req, res) => {
  const { slug } = req.params;
  const note = await db.getNote(slug);

  if (note && note.password) {
    const notePassword = req.query.pass || req.headers['x-note-password'];
    let authed = false;
    if (notePassword) authed = await bcrypt.compare(notePassword, note.password);
    if (!authed) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(403).send('Note is password-protected. Provide ?pass=xxx in URL.');
    }
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(note ? (note.content || '') : '');
});

module.exports = app;
