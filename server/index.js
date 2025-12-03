import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load env from server/.env first (preferred), then fallback to project root .env for local dev
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

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
  credentials: false,
};
app.use(cors(corsOptions));
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

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

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
