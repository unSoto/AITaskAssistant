const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const axios = require('axios');

// Получить задачи текущего пользователя
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tasks WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать задачу (отправляем текст на Python-сервис для анализа)
router.post('/', auth, async (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: 'Требуется title' });
  try {
    let analysis = null;
    try {
      const resp = await axios.post(process.env.PYTHON_SERVICE_URL, { text: `${title}\n${description || ''}` }, { timeout: 5000 });
      analysis = resp.data;
    } catch (e) {
      console.warn('Python service unavailable, continuing without analysis');
      analysis = null;
    }
    const result = await db.query(
      'INSERT INTO tasks (user_id, title, description, priority, category, analysis) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.user.id, title, description, analysis?.priority || null, analysis?.category || null, analysis]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить задачу
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority, category } = req.body;
  try {
    const q = await db.query('SELECT * FROM tasks WHERE id=$1 AND user_id=$2', [id, req.user.id]);
    if (!q.rows[0]) return res.status(404).json({ error: 'Задача не найдена' });
    const result = await db.query(
      'UPDATE tasks SET title=$1, description=$2, status=$3, priority=$4, category=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
      [title || q.rows[0].title, description || q.rows[0].description, status || q.rows[0].status, priority || q.rows[0].priority, category || q.rows[0].category, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить задачу
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const q = await db.query('SELECT * FROM tasks WHERE id=$1 AND user_id=$2', [id, req.user.id]);
    if (!q.rows[0]) return res.status(404).json({ error: 'Задача не найдена' });
    await db.query('DELETE FROM tasks WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
