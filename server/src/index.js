const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
const app = require('./app');

const server = http.createServer(app);
const JWT_SECRET = process.env.JWT_SECRET || 'live-notepad-secret-key-2026';
const PORT = process.env.PORT || 5000;

const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
app.set('io', io);

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

    const note = await db.getNote(slug);
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

  socket.on('note-change', async ({ slug, content, userId }) => {
    if (!slug) return;
    socket.to(`note:${slug}`).emit('note-updated', { content, senderId: socket.id, userId });
    await db.saveNote(slug, { content });
  });

  socket.on('language-change', async ({ slug, language }) => {
    if (!slug) return;
    await db.saveNote(slug, { language });
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
