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

// Student login handler
async function handleStudentLogin(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Login error:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        details: error.message
      });
    }
    
    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return res.status(500).json({
        success: false,
        error: 'Error fetching user profile',
        details: profileError.message
      });
    }
    
    // Check if user is a student
    if (profile.role !== 'student') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Student account required.'
      });
    }
    
    // Return the session and user data
    return res.status(200).json({
      success: true,
      session: data.session,
      user: {
        ...profile,
        email: data.user.email
      }
    });
    
  } catch (error) {
    console.error('Login handler error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred during login',
      details: error.message
    });
  }
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
    // Handle login requests
    if (req.method === 'POST' && req.url.endsWith('/login')) {
      const body = await parseRequestBody(req);
      req.body = body; // Attach parsed body to request object
      return await handleStudentLogin(req, res);
    }
    
    // Parse request body for other POST requests
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

      // Validate name (minimum 1 character after trim)
      const trimmedName = name ? name.trim() : '';
      if (!trimmedName) {
        const error = new Error('Please enter a student name');
        error.details = { 
          received: body,
          required: ['name (required)']
        };
        error.code = 'NAME_REQUIRED';
        console.error('Validation error:', error);
        throw error;
      }

      // Validate email format if provided
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        const error = new Error('Invalid email format');
        error.details = {
          received: { email },
          expected: 'valid email format (e.g., user@example.com)'
        };
        console.error('Validation error:', error);
        throw error;
      }

      console.log('Attempting to create student profile...');
      
      // Create the profile with only existing columns
      // Let Supabase handle the ID generation by not including it here
      const studentData = {
        full_name: trimmedName,
        email: email ? email.trim() : `${trimmedName.replace(/\s+/g, '.').toLowerCase()}@kids-paradise.com`,
        grade: grade ? parseInt(grade, 10) : null,
        role: 'student',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
      
      // First, check if a user with this email already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', studentData.email)
        .maybeSingle();

      if (existingUser) {
        const error = new Error('A user with this email already exists');
        error.code = 'DUPLICATE_EMAIL';
        throw error;
      }

      // First, create the auth user
      console.log('Creating auth user with email:', studentData.email);
      const password = body.password || Math.random().toString(36).slice(2) + 'A1!'; // Use provided password or generate a random one
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: studentData.email,
        password: password,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          full_name: studentData.full_name,
          role: 'student'
        }
      });
      
      // If password was provided, we need to sign in the user to set the session
      if (body.password) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: studentData.email,
          password: password
        });
        
        if (signInError) {
          console.error('Error signing in user after creation:', signInError);
          // Continue with creation even if sign-in fails
        }
      }

      if (authError) {
        console.error('Auth error:', authError);
        return res.status(400).json({
          success: false,
          error: 'Failed to create user account',
          message: authError.message,
          details: {
            code: authError.code,
            hint: authError.hint
          }
        });
      }

      console.log('Auth user created, ID:', authData.user.id);
      
      // Then create the profile with the same ID as the auth user
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id, // Use the same ID from auth
          full_name: studentData.full_name,
          email: studentData.email,
          grade: studentData.grade,
          role: 'student',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select('id, full_name, email, grade, role, created_at, updated_at');

      if (error) {
        console.error('Database error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          table: error.table,
          constraint: error.constraint
        });
        
        // Attempt to clean up the auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        
        return res.status(400).json({
          success: false,
          error: 'Failed to create student profile',
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