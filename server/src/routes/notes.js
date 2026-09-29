const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

// Helper verify note password
async function checkNoteAuth(note, providedPassword, user) {
  if (!note || !note.password) return true;
  if (user && note.ownerId === user.id) return true;
  if (!providedPassword) return false;
  return await bcrypt.compare(providedPassword, note.password);
}

// User notes
router.get('/my', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập' });
  }
  const notes = await db.getUserNotes(req.user.id);
  const formatted = notes.map(n => ({
    slug: n.slug,
    language: n.language || 'plaintext',
    hasPassword: !!n.password,
    charsCount: (n.content || '').length,
    wordsCount: (n.content || '').trim().split(/\s+/).filter(Boolean).length,
    updatedAt: n.updatedAt || n.createdAt,
    preview: (n.content || '').slice(0, 100),
  }));
  res.json({ notes: formatted });
});

// Save or update note content & language
router.post('/:slug', async (req, res) => {
  const { slug } = req.params;
  const { content, language } = req.body;
  const notePassword = req.headers['x-note-password'];

  let note = await db.getNote(slug);
  if (note && note.password) {
    const isAuthed = await checkNoteAuth(note, notePassword, req.user);
    if (!isAuthed) {
      return res.status(403).json({ error: 'Ghi chú có mật khẩu bảo vệ' });
    }
  }

  const saved = await db.saveNote(slug, {
    content: content !== undefined ? content : (note ? note.content : ''),
    language: language !== undefined ? language : (note ? note.language : 'plaintext'),
    ownerId: req.user ? req.user.id : (note ? note.ownerId : null),
  });

  res.json({ success: true, note: saved });
});

// Get note by slug
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const notePassword = req.headers['x-note-password'];
  const note = await db.getNote(slug);

  if (!note) {
    return res.json({
      slug,
      content: '',
      language: 'plaintext',
      hasPassword: false,
      isOwner: false,
      isNew: true,
    });
  }

  const hasPassword = !!note.password;
  const isOwner = req.user ? note.ownerId === req.user.id : false;

  if (hasPassword && !isOwner) {
    const isAuthed = await checkNoteAuth(note, notePassword, req.user);
    if (!isAuthed) {
      return res.json({
        slug,
        hasPassword: true,
        locked: true,
        language: note.language || 'plaintext',
      });
    }
  }

  res.json({
    slug: note.slug,
    content: note.content || '',
    language: note.language || 'plaintext',
    hasPassword,
    isOwner,
    locked: false,
    updatedAt: note.updatedAt,
  });
});

// Verify note password
router.post('/:slug/verify', async (req, res) => {
  const { slug } = req.params;
  const { password } = req.body;
  const note = await db.getNote(slug);

  if (!note || !note.password) {
    return res.json({ success: true });
  }

  const match = await bcrypt.compare(password || '', note.password);
  if (!match) {
    return res.status(401).json({ success: false, error: 'Mật khẩu ghi chú không chính xác!' });
  }

  res.json({
    success: true,
    content: note.content,
    language: note.language,
  });
});

// Set or remove password
router.post('/:slug/set-password', async (req, res) => {
  const { slug } = req.params;
  const { password, currentPassword } = req.body;
  let note = await db.getNote(slug);

  if (!note) {
    note = await db.saveNote(slug, {
      content: '',
      ownerId: req.user ? req.user.id : null,
    });
  }

  const isOwner = req.user && note.ownerId === req.user.id;

  if (note.password && !isOwner) {
    const isValid = await bcrypt.compare(currentPassword || '', note.password);
    if (!isValid) {
      return res.status(403).json({ error: 'Mật khẩu hiện tại không đúng. Không thể thay đổi!' });
    }
  }

  let newHashed = null;
  if (password && password.trim().length > 0) {
    newHashed = await bcrypt.hash(password.trim(), 10);
  }

  await db.saveNote(slug, { password: newHashed });

  res.json({
    success: true,
    hasPassword: !!newHashed,
    message: newHashed ? 'Đã bật mật khẩu bảo vệ cho ghi chú!' : 'Đã gỡ bỏ mật khẩu bảo vệ!',
  });
});

// Claim note for logged-in user
router.post('/:slug/claim', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập' });
  }
  const { slug } = req.params;
  const note = await db.getNote(slug);
  if (note) {
    await db.saveNote(slug, { ownerId: req.user.id });
  } else {
    await db.saveNote(slug, { ownerId: req.user.id, content: '' });
  }
  res.json({ success: true, message: 'Đã lưu ghi chú này vào tài khoản của bạn' });
});

module.exports = router;

