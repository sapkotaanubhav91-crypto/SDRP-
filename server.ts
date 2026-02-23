import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database Setup
const db = new Database('app.db');
db.pragma('journal_mode = WAL');

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('profile', 'spreadsheet')),
    content TEXT, -- JSON for spreadsheet data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('trait', 'weakness', 'secret', 'feature')),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
  );
`);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

app.use(express.json());
app.use(cookieParser());

// Auth Middleware
interface AuthRequest extends Request {
  user?: { id: string; username: string };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// API Routes

// Auth
app.post('/api/auth/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const stmt = db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)');
    stmt.run(id, username, hashedPassword);

    const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: true, // Required for SameSite=None
      sameSite: 'none', // Required for cross-origin iframe
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    res.json({ user: { id, username } });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username) as any;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
  res.cookie('token', token, { 
    httpOnly: true, 
    secure: true, // Required for SameSite=None
    sameSite: 'none', // Required for cross-origin iframe
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });
  res.json({ user: { id: user.id, username: user.username } });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

// Books (Profiles & Spreadsheets)
app.get('/api/books', authenticateToken, (req: AuthRequest, res) => {
  const stmt = db.prepare('SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC');
  const books = stmt.all(req.user!.id);
  res.json(books);
});

app.post('/api/books', authenticateToken, (req: AuthRequest, res) => {
  const { title, type } = req.body;
  if (!title || !type) return res.status(400).json({ error: 'Title and type required' });

  const id = uuidv4();
  const stmt = db.prepare('INSERT INTO books (id, user_id, title, type, content) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, req.user!.id, title, type, type === 'spreadsheet' ? '[]' : null);
  res.json({ id, title, type });
});

app.get('/api/books/:id', authenticateToken, (req: AuthRequest, res) => {
  const stmt = db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?');
  const book = stmt.get(req.params.id, req.user!.id) as any;
  if (!book) return res.status(404).json({ error: 'Book not found' });

  if (book.type === 'profile') {
    const entriesStmt = db.prepare('SELECT * FROM entries WHERE book_id = ?');
    book.entries = entriesStmt.all(book.id);
  }
  
  res.json(book);
});

app.put('/api/books/:id', authenticateToken, (req: AuthRequest, res) => {
  const { title, content } = req.body;
  const stmt = db.prepare('UPDATE books SET title = COALESCE(?, title), content = COALESCE(?, content) WHERE id = ? AND user_id = ?');
  const result = stmt.run(title, content, req.params.id, req.user!.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Book not found' });
  res.json({ message: 'Updated' });
});

app.delete('/api/books/:id', authenticateToken, (req: AuthRequest, res) => {
  const stmt = db.prepare('DELETE FROM books WHERE id = ? AND user_id = ?');
  const result = stmt.run(req.params.id, req.user!.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Book not found' });
  res.json({ message: 'Deleted' });
});

// Entries (Traits, Weaknesses, Secrets)
app.post('/api/entries', authenticateToken, (req: AuthRequest, res) => {
  const { book_id, type, content } = req.body;
  
  // Verify ownership
  const bookStmt = db.prepare('SELECT user_id FROM books WHERE id = ?');
  const book = bookStmt.get(book_id) as any;
  if (!book || book.user_id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

  const id = uuidv4();
  const stmt = db.prepare('INSERT INTO entries (id, book_id, type, content) VALUES (?, ?, ?, ?)');
  stmt.run(id, book_id, type, content);
  res.json({ id, book_id, type, content });
});

app.delete('/api/entries/:id', authenticateToken, (req: AuthRequest, res) => {
  // Verify ownership via join
  const stmt = db.prepare(`
    DELETE FROM entries 
    WHERE id = ? AND book_id IN (SELECT id FROM books WHERE user_id = ?)
  `);
  const result = stmt.run(req.params.id, req.user!.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Entry not found' });
  res.json({ message: 'Deleted' });
});

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
