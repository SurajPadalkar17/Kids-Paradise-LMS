import { createClient } from '@supabase/supabase-js';

// Log environment variables for debugging (remove in production)
console.log('Environment Variables:', {
  NODE_ENV: process.env.NODE_ENV,
  SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Missing',
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'Set' : 'Missing',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
  VITE_SUPABASE_SERVICE_ROLE_KEY: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'
});

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  const error = new Error('Missing required Supabase environment variables');
  console.error('Error:', {
    message: error.message,
    SUPABASE_URL: SUPABASE_URL ? 'Set' : 'Missing',
    SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'
  });
  throw error;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper function to parse request body
async function parseRequestBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        console.error('Error parsing request body:', e);
        resolve({});
      }
    });
  });
}

export default async (req, res) => {
  console.log('=== New Request ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return res.status(200).end();
  }

  try {
    // Parse request body for POST requests
    if (req.method === 'POST') {
      const body = await parseRequestBody(req);
      console.log('Raw request body:', body);
      console.log('Parsed request body:', JSON.stringify(body, null, 2));
      
      if (!body) {
        throw new Error('Request body is empty or invalid JSON');
      }
      
      // Extract and validate required fields
      const { name, email, grade } = body;
      console.log('Processing student data:', { 
        name, 
        email, 
        grade,
        hasPassword: !!body.password,
        body: JSON.stringify(body, null, 2)
      });

      if (!name) {
        const error = new Error('Name is required');
        error.details = { 
          received: body,
          required: ['name']
        };
        console.error('Validation error:', error);
        throw error;
      }

      console.log('Attempting to create student profile...');
      
      // Create the profile with only existing columns
      const studentData = {
        full_name: name,
        email: email || `${name.replace(/\s+/g, '.').toLowerCase()}@kids-paradise.com`,
        grade: grade ? parseInt(grade, 10) : null,
        role: 'student'
      };

      console.log('Attempting to insert student:', JSON.stringify(studentData, null, 2));

      console.log('Attempting to connect to Supabase...');
      console.log('Supabase URL:', SUPABASE_URL);
      console.log('Table: profiles');
      
      // Test connection first
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
        
      if (testError) {
        console.error('Supabase connection test failed:', testError);
        throw new Error(`Supabase connection failed: ${testError.message}`);
      }
      
      console.log('Supabase connection successful, inserting student data...');
      
      const { data, error } = await supabase
        .from('profiles')
        .insert([studentData])
        .select();

      if (error) {
        console.error('Database error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          table: error.table,
          constraint: error.constraint
        });
        
        return res.status(400).json({
          success: false,
          error: 'Failed to create student',
          message: error.message,
          details: {
            code: error.code,
            hint: error.hint,
            table: error.table
          }
        });
      }

      console.log('Student profile created successfully:', data);
      return res.status(201).json({
        success: true,
        data: {
          id: data[0].id,
          full_name: name,
          email: data[0].email,
          grade: data[0].grade,
          role: 'student'
        }
      });
      
    } else if (req.method === 'GET') {
      console.log('Fetching all students...');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, grade, created_at, updated_at')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching students:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch students',
          details: error
        });
      }

      console.log(`Fetched ${data.length} students`);
      return res.status(200).json({ 
        success: true,
        count: data.length,
        data: data.map(student => ({
          id: student.id,
          full_name: student.full_name,
          email: student.email,
          grade: student.grade,
          created_at: student.created_at,
          updated_at: student.updated_at
        }))
      });
      
    } else {
      return res.status(405).json({ 
        success: false,
        error: 'Method not allowed',
        allowed: ['GET', 'POST', 'OPTIONS']
      });
    }
  } catch (error) {
    console.error('=== SERVER ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error.details || 'No additional details');
    console.error('Error code:', error.code);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // More detailed error response
    const errorResponse = {
      success: false,
      error: 'Internal server error',
      message: error.message,
      type: error.name || 'Error',
      ...(process.env.NODE_ENV !== 'production' && {
        details: error.details,
        code: error.code,
        stack: error.stack,
        env: {
          NODE_ENV: process.env.NODE_ENV,
          SUPABASE_URL: SUPABASE_URL ? 'Set' : 'Missing',
          SUPABASE_KEY: SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'
        }
      })
    };
    
    console.error('Sending error response:', JSON.stringify(errorResponse, null, 2));
    return res.status(500).json(errorResponse);
  }
};