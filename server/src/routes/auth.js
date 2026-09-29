const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { generateCaptcha, verifyCaptcha } = require('../captcha');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'live-notepad-secret-key-2026';

// 1. Get Captcha
router.get('/captcha', (req, res) => {
  const captcha = generateCaptcha();
  res.json(captcha);
});

// 2. Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, captchaId, captchaAnswer } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ tên đăng nhập, email và mật khẩu' });
    }

    if (!captchaId || !captchaAnswer) {
      return res.status(400).json({ error: 'Vui lòng nhập mã captcha' });
    }

    const isCaptchaValid = verifyCaptcha(captchaId, captchaAnswer);
    if (!isCaptchaValid) {
      return res.status(400).json({ error: 'Mã captcha không đúng hoặc đã hết hạn. Hãy thử lại!' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    if (await db.findUserByUsername(username)) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
    }

    if (await db.findUserByEmail(email)) {
      return res.status(400).json({ error: 'Email đã được đăng ký' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: crypto.randomUUID(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    await db.createUser(newUser);

    const token = jwt.sign({ id: newUser.id, username: newUser.username, email: newUser.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      message: 'Đăng ký tài khoản thành công!',
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Lỗi server khi đăng ký' });
  }
});

// 3. Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const user = await db.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập' });
  }
});

// 4. Me
router.get('/me', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }
    let user = await db.findUserById(req.user.id);
    if (!user) {
      // Fallback to token payload if user is not found in database cache yet
      user = req.user;
    }
    res.json({
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('Me endpoint error:', err);
    if (req.user) {
      return res.json({
        user: { id: req.user.id, username: req.user.username, email: req.user.email },
      });
    }
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
