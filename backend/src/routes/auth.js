const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const dotenv = require('dotenv');
dotenv.config();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Неполные данные' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at', [username, hash]);
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Пользователь уже существует' });
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Неполные данные' });
  try {
    const result = await db.query('SELECT id, username, password_hash FROM users WHERE username=$1', [username]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'Неверные учётные данные' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Неверные учётные данные' });
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
