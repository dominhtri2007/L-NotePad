const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');

const app = express();
const server = http.createServer(app);
const JWT_SECRET = process.env.JWT_SECRET || 'live-notepad-secret-key-2026';
const PORT = process.env.PORT || 5000;

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

const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

// Change Slug
app.post('/api/note/:slug/change-slug', async (req, res) => {
  const { slug } = req.params;
  const { newSlug, currentPassword } = req.body;

  if (!newSlug || !/^[a-zA-Z0-9_-]+$/.test(newSlug)) {
    return res.status(400).json({ error: 'URL mới chỉ được chứa chữ cái, số, gạch ngang và gạch dưới' });
  }

  const note = db.getNote(slug);
  if (note && note.password) {
    const isOwner = req.user && note.ownerId === req.user.id;
    if (!isOwner) {
      const isValid = await bcrypt.compare(currentPassword || '', note.password);
      if (!isValid) return res.status(403).json({ error: 'Mật khẩu hiện tại không đúng' });
    }
  }

  const result = db.changeSlug(slug, newSlug);
  if (!result.success) return res.status(400).json({ error: result.error });

  io.to(`note:${slug}`).emit('slug-changed', { newSlug });
  res.json({ success: true, newSlug, message: 'Đã đổi URL thành công!' });
});

// RAW Endpoint (Tính năng xem văn bản thô)
app.get('/raw/:slug', async (req, res) => {
  const { slug } = req.params;
  const note = db.getNote(slug);

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

// Serve frontend static build if available
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/raw')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Socket.io
const roomViewers = new Map();
const saveTimers = new Map();

io.on('connection', (socket) => {
  let currentSlug = null;

  socket.on('join-note', async ({ slug, password, userToken }) => {
    if (!slug) return;
    if (currentSlug) {
      socket.leave(`note:${currentSlug}`);
      const set = roomViewers.get(currentSlug);
      if (set) {
        set.delete(socket.id);
        io.to(`note:${currentSlug}`).emit('viewers-count', set.size);
      }
    }

    currentSlug = slug;
    socket.join(`note:${slug}`);
    if (!roomViewers.has(slug)) roomViewers.set(slug, new Set());
    roomViewers.get(slug).add(socket.id);
    io.to(`note:${slug}`).emit('viewers-count', roomViewers.get(slug).size);

    const note = db.getNote(slug);
    if (note) {
      let locked = false;
      if (note.password) {
        let isOwner = false;
        if (userToken) {
          try {
            const decoded = jwt.verify(userToken, JWT_SECRET);
            if (decoded.id === note.ownerId) isOwner = true;
          } catch (e) {}
        }
        if (!isOwner) {
          const passMatch = password ? await bcrypt.compare(password, note.password) : false;
          if (!passMatch) locked = true;
        }
      }

      if (locked) {
        socket.emit('note-locked', { slug, hasPassword: true });
      } else {
        socket.emit('init-note', {
          content: note.content || '',
          language: note.language || 'plaintext',
          hasPassword: !!note.password,
          updatedAt: note.updatedAt,
        });
      }
    } else {
      socket.emit('init-note', { content: '', language: 'plaintext', hasPassword: false });
    }
  });

  socket.on('note-change', ({ slug, content, userId }) => {
    if (!slug) return;
    socket.to(`note:${slug}`).emit('note-updated', { content, senderId: socket.id, userId });

    db.saveNote(slug, { content });
  });

  socket.on('language-change', ({ slug, language }) => {
    if (!slug) return;
    db.saveNote(slug, { language });
    socket.to(`note:${slug}`).emit('language-updated', { language });
  });

  socket.on('typing', ({ slug, username }) => {
    if (!slug) return;
    socket.to(`note:${slug}`).emit('user-typing', { username: username || 'Khách' });
  });

  socket.on('disconnect', () => {
    if (currentSlug && roomViewers.has(currentSlug)) {
      const set = roomViewers.get(currentSlug);
      set.delete(socket.id);
      if (set.size === 0) roomViewers.delete(currentSlug);
      else io.to(`note:${currentSlug}`).emit('viewers-count', set.size);
    }
  });
});

server.listen(PORT, () => {
  console.log(`> Live Notepad Server listening on http://localhost:${PORT}`);
});
