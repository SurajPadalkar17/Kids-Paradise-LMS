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
      
      // First, create the auth user with service role
      console.log('Creating auth user with email:', studentData.email);
      const password = body.password || Math.random().toString(36).slice(2) + 'A1!'; // Use provided password or generate a random one
      
      // Create auth user with email confirmation
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: studentData.email,
        password: password,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          full_name: studentData.full_name,
          role: 'student'
        },
        // Ensure the user is created with the student role
        app_metadata: {
          role: 'student'
        }
      });

      if (authError) {
        console.error('Auth user creation error:', authError);
        throw new Error(`Failed to create auth user: ${authError.message}`);
      }

      console.log('Auth user created successfully, ID:', authData.user.id);
      
      // Create profile using the service role client
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          email: studentData.email,
          full_name: studentData.full_name,
          role: 'student',
          grade: studentData.grade,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }

      console.log('Profile created successfully:', profileData);
      
      // Sign in the user to set the session if password was provided
      if (body.password) {
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: studentData.email,
            password: password
          });
          
          if (signInError) {
            console.error('Error signing in user after creation (non-fatal):', signInError);
          } else {
            console.log('User signed in successfully after creation');
          }
        } catch (signInError) {
          console.error('Error during sign-in after user creation (non-fatal):', signInError);
        }
      }

      // Check if a user with this email already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', studentData.email)
        .maybeSingle();

      if (existingUser) {
        // Clean up auth user if it was created
        if (authData?.user?.id) {
          await supabase.auth.admin.deleteUser(authData.user.id);
        }
        
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists',
          message: 'A student with this email address is already registered',
          details: {
            email: studentData.email,
            existingUserId: existingUser.id
          }
        });
      }

      console.log('Student profile created successfully:', data);
      return res.status(201).json({
        success: true,
        data: {
          id: profileData.id,
          full_name: profileData.full_name,
          email: profileData.email,
          grade: profileData.grade,
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