const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error('Missing required Supabase environment variables');
  process.exit(1);
}

// Create admin client with service role key for all operations
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
      
      // Extract and validate required fields
      const { name, age, grade, parentName, contactNumber, address } = body;
      const email = body.email || `${name.replace(/\s+/g, '.').toLowerCase()}@kids-paradise.com`;
      const password = body.password || `Student@${Math.random().toString(36).slice(-8)}`;

      console.log('Received student data:', { name, email, age, grade, parentName, contactNumber, address });

      if (!name || !age || !grade || !parentName || !contactNumber || !address) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          received: body,
          required: ['name', 'age', 'grade', 'parentName', 'contactNumber', 'address']
        });
      }

      console.log('Attempting to create student...');
      
      try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: name,
            role: 'student'
          }
        });

        if (authError) throw authError;

        const userId = authData.user.id;
        
        // Create profile
        const { data, error: dbError } = await supabase
          .from('profiles')
          .insert([{ 
            id: userId,
            full_name: name,
            email,
            age: parseInt(age, 10),
            grade, 
            parent_name: parentName, 
            contact_number: contactNumber, 
            address,
            role: 'student'
          }])
          .select();

        if (dbError) throw dbError;

        console.log('Student created successfully');
        return res.status(201).json({ 
          success: true,
          data: {
            id: userId,
            full_name: name,
            email,
            role: 'student'
          }
        });

      } catch (error) {
        console.error('Error creating student:', error);
        return res.status(500).json({ 
          error: 'Failed to create student',
          details: error.message
        });
      }
      
    } else if (req.method === 'GET') {
      console.log('Fetching all students...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching students:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch students',
          details: error.message
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
          parent_name: student.parent_name,
          contact_number: student.contact_number,
          created_at: student.created_at
        }))
      });
      
    } else {
      return res.status(405).json({ 
        error: 'Method not allowed',
        allowed: ['GET', 'POST', 'OPTIONS']
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};