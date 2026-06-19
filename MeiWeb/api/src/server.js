'use strict';

require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit   = require('express-rate-limit');
const { connectDB } = require('./config/db');
const { optionalAuth } = require('./middleware/auth');

// =============================================
// MEI BOT — EXPRESS API SERVER
// Port: process.env.PORT || 4000
// =============================================

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Security & Parsing ────────────────────────
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ── CORS ──────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, curl)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: Origin '${origin}' not allowed`));
  },
  credentials: true,
}));

// ── Global Rate Limiter ───────────────────────
const globalLimiter = rateLimit({
  windowMs: 60_000,     // 1 dakika
  max:      120,        // max 120 istek/dk
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api', globalLimiter);

// ── Stricter auth endpoint limiter ────────────
const authLimiter = rateLimit({
  windowMs: 60_000,
  max:      10,
  message: { error: 'Too many auth attempts. Please try again later.' },
});

// ── Inject optional user (for /me routes) ─────
app.use(optionalAuth);

// ── Routes ────────────────────────────────────
app.use('/api/auth',        authLimiter, require('./routes/auth'));
app.use('/api/stats',       require('./routes/stats'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/guilds',      require('./routes/guilds'));
app.use('/api/guild',       require('./routes/guild'));
app.use('/api/user',        require('./routes/user'));

// ── Health check ──────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route '${req.path}' not found.` });
});

// ── Error handler ─────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Boot ──────────────────────────────────────
async function boot() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[API] Mei Bot API running on port ${PORT}`);
  });
}

boot().catch(err => {
  console.error('[Boot] Fatal error:', err.message);
  process.exit(1);
});

module.exports = app;
