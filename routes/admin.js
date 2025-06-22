const express = require('express');
const router = express.Router();
const db = require('../db');
const { body, validationResult } = require('express-validator');

// Debug middleware to log all admin requests
router.use((req, res, next) => {
  console.log('=== ADMIN ROUTE ACCESSED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Path:', req.path);
  console.log('Original URL:', req.originalUrl);
  console.log('Body:', req.body);
  console.log('===========================');
  next();
});

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.session || !req.session.isAdmin) {
    return res.redirect('/admin/login');
  }
  next();
};

// Admin dashboard - main admin page
router.get('/', isAdmin, async (req, res) => {
  try {
    console.log('Loading admin dashboard...');
    
    // Test database connection first
    const [testResult] = await db.promise().query('SELECT 1 as test');
    console.log('Database connection test:', testResult);
    
    // Check if tables exist
    const [tables] = await db.promise().query('SHOW TABLES');
    console.log('Available tables:', tables);
    
    // Get recent visits with visitor details
    const [visits] = await db.promise().query(`
      SELECT 
        v.name as visitor_name,
        v.email as visitor_email,
        v.phone as visitor_phone,
        v.company_name,
        v.company_address,
        vs.staff_email,
        vs.reason,
        vs.status,
        vs.visit_time as created_at,
        vs.check_out_time,
        vs.id as visit_id,
        vs.visitor_type,
        vs.tag_number,
        cvd.work_site,
        cvd.project_detail,
        cvd.supervising_department,
        svd.material_supplied,
        svd.receiving_department
      FROM visits vs 
      JOIN visitors v ON vs.visitor_id = v.id 
      LEFT JOIN contractor_visit_details cvd ON vs.id = cvd.visit_id
      LEFT JOIN supplier_visit_details svd ON vs.id = svd.visit_id
      ORDER BY vs.visit_time DESC
      LIMIT 50
    `);

    console.log('Visits loaded:', visits.length);
    console.log('Visits data:', visits);

    // Get statistics
    const [stats] = await db.promise().query(`
      SELECT 
        COUNT(*) as total_visits,
        SUM(CASE WHEN status = 'allowed' THEN 1 ELSE 0 END) as approved_visits,
        SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied_visits,
        SUM(CASE WHEN status IS NULL OR status = 'pending' THEN 1 ELSE 0 END) as pending_visits
      FROM visits
    `);

    console.log('Stats loaded:', stats[0]);

    // Get today's visits
    const [todayVisits] = await db.promise().query(`
      SELECT COUNT(*) as today_count
      FROM visits 
      WHERE DATE(visit_time) = CURDATE()
    `);

    console.log('Today visits:', todayVisits[0].today_count);

    const dashboardData = {
      visits: visits || [], 
      stats: stats[0] || { total_visits: 0, approved_visits: 0, denied_visits: 0, pending_visits: 0 }, 
      todayVisits: todayVisits[0] ? todayVisits[0].today_count : 0 
    };

    console.log('Rendering dashboard with data:', dashboardData);

    res.render('admin/dashboard', dashboardData);
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    console.error('Error stack:', error.stack);
    res.status(500).render('error', { 
      message: 'Failed to load dashboard',
      error: error.message 
    });
  }
});

// Simple test route for admin dashboard
router.get('/test', isAdmin, (req, res) => {
  try {
    console.log('Testing simple admin dashboard...');
    const testData = {
      visits: [
        {
          visitor_name: 'Test Visitor',
          visitor_email: 'test@example.com',
          visitor_phone: '1234567890',
          staff_email: 'staff@example.com',
          reason: 'Test visit',
          status: 'pending',
          created_at: new Date(),
          visit_id: 1
        }
      ],
      stats: {
        total_visits: 1,
        approved_visits: 0,
        denied_visits: 0,
        pending_visits: 1
      },
      todayVisits: 1
    };
    
    console.log('Rendering test dashboard with data:', testData);
    res.render('admin/dashboard', testData);
  } catch (error) {
    console.error('Error in test dashboard:', error);
    res.status(500).render('error', { 
      message: 'Test dashboard failed',
      error: error.message 
    });
  }
});

// Simple dashboard test route
router.get('/simple', isAdmin, async (req, res) => {
  try {
    console.log('Testing simple dashboard template...');
    
    // Get real data but use simple template
    const [visits] = await db.promise().query(`
      SELECT 
        v.name as visitor_name,
        v.email as visitor_email,
        v.phone as visitor_phone,
        vs.staff_email,
        vs.reason,
        vs.status,
        vs.visit_time as created_at,
        vs.id as visit_id
      FROM visits vs 
      JOIN visitors v ON vs.visitor_id = v.id 
      ORDER BY vs.visit_time DESC
      LIMIT 10
    `);

    const [stats] = await db.promise().query(`
      SELECT 
        COUNT(*) as total_visits,
        SUM(CASE WHEN status = 'allowed' THEN 1 ELSE 0 END) as approved_visits,
        SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied_visits,
        SUM(CASE WHEN status IS NULL OR status = 'pending' THEN 1 ELSE 0 END) as pending_visits
      FROM visits
    `);

    const [todayVisits] = await db.promise().query(`
      SELECT COUNT(*) as today_count
      FROM visits 
      WHERE DATE(visit_time) = CURDATE()
    `);

    const dashboardData = {
      visits: visits || [], 
      stats: stats[0] || { total_visits: 0, approved_visits: 0, denied_visits: 0, pending_visits: 0 }, 
      todayVisits: todayVisits[0] ? todayVisits[0].today_count : 0 
    };

    console.log('Rendering simple dashboard with data:', dashboardData);
    res.render('admin/simple-dashboard', dashboardData);
  } catch (error) {
    console.error('Error in simple dashboard:', error);
    res.status(500).render('error', { 
      message: 'Simple dashboard failed',
      error: error.message 
    });
  }
});

// Test environment variables route (for debugging only - remove in production)
router.get('/test-env', (req, res) => {
  console.log('Environment test route accessed');
  
  const envTest = {
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'NOT SET',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? 'SET (length: ' + process.env.ADMIN_PASSWORD.length + ')' : 'NOT SET',
    testUsername: 'admin',
    testPassword: 'admin123',
    usernameMatch: 'admin' === process.env.ADMIN_USERNAME,
    passwordMatch: 'admin123' === process.env.ADMIN_PASSWORD
  };
  
  console.log('Environment test results:', envTest);
  
  res.send(`
    <h1>Environment Variables Test</h1>
    <pre>${JSON.stringify(envTest, null, 2)}</pre>
    <br>
    <a href="/admin/login">Back to Login</a>
  `);
});

// Test POST route (for debugging only - remove in production)
router.post('/test-post', (req, res) => {
  console.log('Test POST route accessed');
  console.log('Request body:', req.body);
  console.log('Request method:', req.method);
  
  res.send(`
    <h1>POST Test Successful</h1>
    <p>POST requests are working!</p>
    <p>Request body: ${JSON.stringify(req.body)}</p>
    <a href="/admin/login">Back to Login</a>
  `);
});

// Test login route (for debugging only - remove in production)
router.get('/test-login', (req, res) => {
  console.log('Test login route accessed');
  console.log('Environment variables:');
  console.log('ADMIN_USERNAME:', process.env.ADMIN_USERNAME);
  console.log('ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? '***SET***' : 'NOT SET');
  
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return res.send(`
      <h1>Admin Login Test</h1>
      <p>❌ Admin credentials not configured</p>
      <p>Please set ADMIN_USERNAME and ADMIN_PASSWORD in Railway environment variables</p>
    `);
  }
  
  // Auto-login for testing
  req.session.isAdmin = true;
  res.redirect('/admin');
});

// Admin login handler - POST route (must come before GET /login)
router.post('/login', async (req, res) => {
  try {
    console.log('=== ADMIN LOGIN ATTEMPT ===');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Session ID:', req.sessionID);
    console.log('Current session:', req.session);
    console.log('Environment variables:');
    console.log('ADMIN_USERNAME:', process.env.ADMIN_USERNAME);
    console.log('ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? '***SET***' : 'NOT SET');
    
    // Check if we have the required fields
    if (!req.body.username || !req.body.password) {
      console.log('❌ Missing username or password in request body');
      console.log('Username provided:', !!req.body.username);
      console.log('Password provided:', !!req.body.password);
      return res.status(400).send(`
        <h1>Login Error</h1>
        <p>Missing username or password</p>
        <p>Request body: ${JSON.stringify(req.body)}</p>
        <a href="/admin/login">Back to Login</a>
      `);
    }

    const { username, password } = req.body;
    console.log('Login attempt - Username:', username);
    console.log('Login attempt - Password provided:', password ? 'YES' : 'NO');
    console.log('Login attempt - Password length:', password ? password.length : 0);
    
    // Check if environment variables are set
    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
      console.log('❌ ERROR: Admin credentials not set in environment variables');
      return res.status(500).send(`
        <h1>Configuration Error</h1>
        <p>Admin credentials not configured. Please contact administrator.</p>
        <p>ADMIN_USERNAME: ${process.env.ADMIN_USERNAME ? 'SET' : 'NOT SET'}</p>
        <p>ADMIN_PASSWORD: ${process.env.ADMIN_PASSWORD ? 'SET' : 'NOT SET'}</p>
        <a href="/admin/login">Back to Login</a>
      `);
    }
    
    // Detailed credential comparison
    console.log('=== CREDENTIAL COMPARISON ===');
    console.log('Provided username:', username);
    console.log('Expected username:', process.env.ADMIN_USERNAME);
    console.log('Username match:', username === process.env.ADMIN_USERNAME);
    console.log('Provided password length:', password.length);
    console.log('Expected password length:', process.env.ADMIN_PASSWORD.length);
    console.log('Password match:', password === process.env.ADMIN_PASSWORD);
    
    // Check credentials
    if (username === process.env.ADMIN_USERNAME && 
        password === process.env.ADMIN_PASSWORD) {
      console.log('✅ Login successful for user:', username);
      console.log('Setting session.isAdmin = true');
      req.session.isAdmin = true;
      console.log('Session after setting:', req.session);
      console.log('Redirecting to /admin');
      return res.redirect('/admin');
    } else {
      console.log('❌ Login failed - credentials mismatch');
      console.log('Expected username:', process.env.ADMIN_USERNAME);
      console.log('Expected password:', process.env.ADMIN_PASSWORD ? '***SET***' : 'NOT SET');
      return res.status(401).send(`
        <h1>Login Failed</h1>
        <p>Invalid credentials</p>
        <p>Username provided: ${username}</p>
        <p>Expected username: ${process.env.ADMIN_USERNAME}</p>
        <p>Password length provided: ${password.length}</p>
        <p>Expected password length: ${process.env.ADMIN_PASSWORD.length}</p>
        <a href="/admin/login">Back to Login</a>
      `);
    }
  } catch (error) {
    console.error('Error in login handler:', error);
    res.status(500).render('error', { 
      message: 'Login failed',
      error: error.message 
    });
  }
});

// Admin login page - GET route
router.get('/login', (req, res) => {
  res.render('admin/login');
});

// Add route to set tag_number for a visit
router.post('/visit/:id/tag', isAdmin, async (req, res) => {
  const visitId = req.params.id;
  const { tag_number } = req.body;
  if (!tag_number || !tag_number.trim()) {
    return res.status(400).json({ success: false, message: 'Tag number is required.' });
  }
  try {
    // Only allow if status is 'allowed' and tag_number is NULL
    const [rows] = await db.promise().query(
      'SELECT status, tag_number FROM visits WHERE id = ?',
      [visitId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Visit not found.' });
    }
    const visit = rows[0];
    if (visit.status !== 'allowed') {
      return res.status(400).json({ success: false, message: 'Tag number can only be set for allowed visits.' });
    }
    if (visit.tag_number) {
      return res.status(400).json({ success: false, message: 'Tag number already set.' });
    }
    await db.promise().query(
      'UPDATE visits SET tag_number = ? WHERE id = ?',
      [tag_number, visitId]
    );
    return res.json({ success: true, tag_number });
  } catch (error) {
    console.error('Error setting tag number:', error);
    return res.status(500).json({ success: false, message: 'Failed to set tag number.' });
  }
});

module.exports = router;