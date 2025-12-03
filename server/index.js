require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (server/.env preferred).');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const RAW_CORS = process.env.CORS_ORIGIN || 'http://localhost:5173';
const ALLOWED_ORIGINS = RAW_CORS.split(',').map((s) => s.trim()).filter(Boolean);
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser requests
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // allow common localhost dev ports
    const isLocalhost = /^http:\/\/localhost:(\d+)$/.test(origin) || /^http:\/\/127\.0\.0\.1:(\d+)$/.test(origin);
    if (isLocalhost) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Apply CORS with options
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));
app.use(express.json());
// Basic request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'kidlit-backend', routes: ['/api/health', '/api/students'] });
});

// Explicitly handle preflight for POST /api/students
app.options('/api/students', cors(corsOptions));

// Test route to verify path is correct
app.get('/api/students', (_req, res) => {
  res.json({ ok: true, hint: 'POST to this same path to create a student' });
});

app.post('/api/students', async (req, res) => {
  try {
    const { name, email, grade, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }

    // 1) Create auth user
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (createErr) return res.status(400).json({ error: createErr.message });

    const user = created.user;
    if (!user) return res.status(500).json({ error: 'Failed to create user' });

    // 2) Insert profile
    const g = Number.isNaN(parseInt(String(grade), 10)) ? null : parseInt(String(grade), 10);
    const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
      id: user.id,
      email,
      full_name: name,
      role: 'student',
      grade: g,
    });
    if (profileErr) return res.status(400).json({ error: profileErr.message });

    return res.json({ id: user.id, email, full_name: name, grade: g, role: 'student' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Allowed origins:', ALLOWED_ORIGINS);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Export for Vercel
module.exports = app;

// Log unexpected exits to diagnose auto-closing
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  process.exit(0);
});
