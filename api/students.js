const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required Supabase environment variables');
  process.exit(1);
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

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Parse request body for POST requests
    if (req.method === 'POST') {
      const body = await parseRequestBody(req);
      console.log('Request body:', JSON.stringify(body, null, 2));
      
      // Extract and validate required fields
      const { name, email, grade } = body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Name is required',
          details: { received: body, required: ['name'] }
        });
      }

      console.log('Attempting to create student profile...');
      
      // Create the profile with only existing columns
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          full_name: name,
          email: email || `${name.replace(/\s+/g, '.').toLowerCase()}@kids-paradise.com`,
          grade: grade ? parseInt(grade, 10) : null,
          role: 'student'
        }])
        .select();

      if (error) {
        console.error('Database error:', error);
        return res.status(400).json({
          success: false,
          error: 'Failed to create student',
          details: error
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
    console.error('Server error:', {
      message: error.message,
      stack: error.stack,
      details: error.details || 'No additional details'
    });
    
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.details,
        stack: error.stack 
      })
    });
  }
};