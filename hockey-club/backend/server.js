const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'hockey_club_secret_2024';
const DB_PATH = path.join(__dirname, 'database.db');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

let db;

async function initDB() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(DB_PATH)) {
    const data = fs.readFileSync(DB_PATH);
    db = new SQL.Database(data);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('coach', 'player')),
      position TEXT,
      number INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS training_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT,
      duration INTEGER,
      intensity TEXT,
      canvas_data TEXT,
      drills TEXT,
      coach_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coach_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS drills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      duration INTEGER,
      intensity TEXT,
      canvas_data TEXT,
      coach_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coach_id) REFERENCES users(id)
    )
  `);

  // Seed demo users
  const existing = db.exec("SELECT COUNT(*) as cnt FROM users");
  if (existing[0].values[0][0] === 0) {
    const coachPass = bcrypt.hashSync('coach123', 10);
    const playerPass = bcrypt.hashSync('player123', 10);
    
    db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
      ['Marcela López', 'coach@club.com', coachPass, 'coach']);
    db.run(`INSERT INTO users (name, email, password, role, position, number) VALUES (?, ?, ?, ?, ?, ?)`,
      ['Valentina García', 'player@club.com', playerPass, 'player', 'Delantera', 9]);
    db.run(`INSERT INTO users (name, email, password, role, position, number) VALUES (?, ?, ?, ?, ?, ?)`,
      ['Sofía Martínez', 'sofia@club.com', playerPass, 'player', 'Defensora', 4]);
    
    saveDB();
  }

  console.log('✅ Base de datos inicializada');
}

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// AUTH MIDDLEWARE
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function coachOnly(req, res, next) {
  if (req.user.role !== 'coach') return res.status(403).json({ error: 'Solo entrenadores' });
  next();
}

// ===== AUTH ROUTES =====
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const result = db.exec(`SELECT * FROM users WHERE email = ?`, [email]);
  if (!result.length || !result[0].values.length) return res.status(401).json({ error: 'Credenciales incorrectas' });
  
  const cols = result[0].columns;
  const row = result[0].values[0];
  const user = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
  
  if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Credenciales incorrectas' });
  
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// ===== USERS ROUTES =====
app.get('/api/users', authMiddleware, coachOnly, (req, res) => {
  const result = db.exec(`SELECT id, name, email, role, position, number, created_at FROM users ORDER BY role, name`);
  if (!result.length) return res.json([]);
  const { columns, values } = result[0];
  res.json(values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]]))));
});

app.post('/api/users', authMiddleware, coachOnly, (req, res) => {
  const { name, email, password, role, position, number } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  try {
    db.run(`INSERT INTO users (name, email, password, role, position, number) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, hashed, role, position || null, number || null]);
    saveDB();
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'Email ya existe' });
  }
});

app.delete('/api/users/:id', authMiddleware, coachOnly, (req, res) => {
  db.run(`DELETE FROM users WHERE id = ?`, [req.params.id]);
  saveDB();
  res.json({ success: true });
});

// ===== DRILLS ROUTES =====
app.get('/api/drills', authMiddleware, (req, res) => {
  const result = db.exec(`SELECT d.*, u.name as coach_name FROM drills d LEFT JOIN users u ON d.coach_id = u.id ORDER BY d.created_at DESC`);
  if (!result.length) return res.json([]);
  const { columns, values } = result[0];
  res.json(values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]]))));
});

app.post('/api/drills', authMiddleware, coachOnly, (req, res) => {
  const { name, description, duration, intensity, canvas_data } = req.body;
  db.run(`INSERT INTO drills (name, description, duration, intensity, canvas_data, coach_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, description, duration, intensity, canvas_data, req.user.id]);
  saveDB();
  res.json({ success: true });
});

app.put('/api/drills/:id', authMiddleware, coachOnly, (req, res) => {
  const { name, description, duration, intensity, canvas_data } = req.body;
  db.run(`UPDATE drills SET name=?, description=?, duration=?, intensity=?, canvas_data=? WHERE id=? AND coach_id=?`,
    [name, description, duration, intensity, canvas_data, req.params.id, req.user.id]);
  saveDB();
  res.json({ success: true });
});

app.delete('/api/drills/:id', authMiddleware, coachOnly, (req, res) => {
  db.run(`DELETE FROM drills WHERE id = ? AND coach_id = ?`, [req.params.id, req.user.id]);
  saveDB();
  res.json({ success: true });
});

// ===== TRAINING SESSIONS ROUTES =====
app.get('/api/sessions', authMiddleware, (req, res) => {
  const result = db.exec(`SELECT s.*, u.name as coach_name FROM training_sessions s LEFT JOIN users u ON s.coach_id = u.id ORDER BY s.date DESC, s.created_at DESC`);
  if (!result.length) return res.json([]);
  const { columns, values } = result[0];
  res.json(values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]]))));
});

app.post('/api/sessions', authMiddleware, coachOnly, (req, res) => {
  const { title, description, date, duration, intensity, canvas_data, drills } = req.body;
  db.run(`INSERT INTO training_sessions (title, description, date, duration, intensity, canvas_data, drills, coach_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, date, duration, intensity, canvas_data, drills, req.user.id]);
  saveDB();
  res.json({ success: true });
});

app.put('/api/sessions/:id', authMiddleware, coachOnly, (req, res) => {
  const { title, description, date, duration, intensity, canvas_data, drills } = req.body;
  db.run(`UPDATE training_sessions SET title=?, description=?, date=?, duration=?, intensity=?, canvas_data=?, drills=? WHERE id=? AND coach_id=?`,
    [title, description, date, duration, intensity, canvas_data, drills, req.params.id, req.user.id]);
  saveDB();
  res.json({ success: true });
});

app.delete('/api/sessions/:id', authMiddleware, coachOnly, (req, res) => {
  db.run(`DELETE FROM training_sessions WHERE id = ? AND coach_id = ?`, [req.params.id, req.user.id]);
  saveDB();
  res.json({ success: true });
});

// ===== PROFILE =====
app.get('/api/me', authMiddleware, (req, res) => {
  const result = db.exec(`SELECT id, name, email, role, position, number FROM users WHERE id = ?`, [req.user.id]);
  if (!result.length) return res.status(404).json({ error: 'No encontrado' });
  const { columns, values } = result[0];
  res.json(Object.fromEntries(columns.map((c, i) => [c, values[0][i]])));
});

// Serve frontend
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`🏑 Hockey Club server running on http://localhost:${PORT}`));
});
