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

// Define allowed origins
const RAW_CORS = process.env.CORS_ORIGIN || 'http://localhost:5173,https://kids-paradise-lms.vercel.app';
const ALLOWED_ORIGINS = [...new Set([
  ...RAW_CORS.split(',').map((s) => s.trim()).filter(Boolean),
  'http://localhost:5173',
  'https://kids-paradise-lms.vercel.app'
])];

console.log('Allowed CORS origins:', ALLOWED_ORIGINS);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('No origin header - allowing request');
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (ALLOWED_ORIGINS.includes(origin) || 
        ALLOWED_ORIGINS.includes('*') || 
        origin.endsWith('.vercel.app')) {
      console.log(`Origin ${origin} is allowed`);
      return callback(null, true);
    }
    
    // Allow localhost for development
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin);
    if (isLocalhost) {
      console.log(`Localhost origin ${origin} is allowed`);
      return callback(null, true);
    }
    
    console.error(`CORS blocked: ${origin} not in allowed origins`);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 204,
  preflightContinue: false
};

// Enhanced request logger
app.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, headers } = req;
  
  // Log request start
  console.log(`[${new Date().toISOString()}] ${method} ${originalUrl}`, {
    headers: {
      origin: headers.origin,
      'user-agent': headers['user-agent'],
      referer: headers.referer
    }
  });

  // Add CORS headers to all responses
  const origin = headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // For preflight requests, respond immediately
  if (method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Apply CORS with options
app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Serve static files from the Vite build directory
const staticPath = path.join(__dirname, '..', 'dist');
app.use(express.static(staticPath, {
  setHeaders: (res, path) => {
    // Set proper MIME types for JavaScript and CSS files
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Handle client-side routing - return index.html for all other GET requests
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Explicitly handle preflight for all API routes
app.options('/api/*', cors(corsOptions));

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
