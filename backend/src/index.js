const express = require('express');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const db = require('./db');

dotenv.config();

const app = express();
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 3000;

async function ensureDb() {
  try {
    const fs = require('fs');
    const path = require('path');
    const sql = fs.readFileSync(path.join(__dirname, 'db', 'init.sql'), 'utf8');
    await db.query(sql);
    console.log('База данных инициализирована');
  } catch (err) {
    console.error('DB init error', err.message || err);
  }
}

ensureDb().then(() => {
  app.listen(port, () => console.log(`Сервер запущен на порту ${port}`));
});
