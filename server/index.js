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
  console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Please check your environment variables.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'https://kids-paradise-lms.vercel.app',
  'https://kids-paradise.vercel.app',
  'https://kids-paradise-admin.vercel.app'
];

// Add any additional origins from environment variable
if (process.env.CORS_ORIGINS) {
  allowedOrigins.push(...process.env.CORS_ORIGINS.split(',').map(s => s.trim()));
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or is a Vercel preview URL
    if (
      allowedOrigins.includes(origin) || 
      allowedOrigins.includes('*') || 
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.vercel.app/') ||
      origin.includes('vercel.app/_next')
    ) {
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin)) {
      return callback(null, true);
    }
    
    console.log(`Blocked by CORS: ${origin}`);
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
  if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app'))) {
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

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.get('/api/students', (_req, res) => {
  res.json({ 
    ok: true, 
    message: 'Students API is working',
    hint: 'POST to this same path to create a student',
    timestamp: new Date().toISOString()
  });
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

// Only start the server if this file is run directly (not when imported as a module)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Allowed origins:', allowedOrigins);
  });

  // Handle shutdown gracefully
  const gracefulShutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });

    // Force close server after 5 seconds
    setTimeout(() => {
      console.error('Forcing server shutdown');
      process.exit(1);
    }, 5000);
  };

  // Listen for termination signals
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

// Log unexpected errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit in production, let the process manager handle it
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Export the Express app for Vercel
module.exports = app;
