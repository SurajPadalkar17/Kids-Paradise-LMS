const express = require('express');
const cors = require('cors');
const studentsHandler = require('./students');

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://kids-paradise-lms.vercel.app',
    'https://kids-paradise.vercel.app',
    'https://kids-paradise-admin.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Students routes
app.use('/api/students', studentsHandler);

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Export the Vercel serverless function
module.exports = app;
