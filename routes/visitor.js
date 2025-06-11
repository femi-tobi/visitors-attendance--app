const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const config = require('../config');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Nodemailer config
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-specific-password'
  }
});

// Validation middleware for new visitors
const validateNewVisitor = [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long')
    .escape(),
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('phone')
    .trim()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Please enter a valid phone number')
    .isLength({ min: 10 })
    .withMessage('Phone number must be at least 10 digits'),
  body('reason')
    .trim()
    .isLength({ min: 5 })
    .withMessage('Please provide a reason for your visit (minimum 5 characters)')
    .escape(),
  body('staff_email')
    .isEmail()
    .withMessage('Please enter a valid staff email address')
    .normalizeEmail()
];

// Validation middleware for returning visitors
const validateReturningVisitor = [
  body('visitor_id').isNumeric(),
  body('reason').trim().isLength({ min: 5 }),
  body('staff_email').isEmail().normalizeEmail()
];

// Serve the form
router.get('/', (req, res) => {
  res.sendFile('index.html', { root: './views' });
});

// Search for existing visitor
router.get('/search', async (req, res) => {
  const { query } = req.query;
  try {
    const sql = `
      SELECT id, name, email, phone 
      FROM visitors 
      WHERE name LIKE ? OR email LIKE ?
      LIMIT 5
    `;
    const searchQuery = `%${query}%`;
    const [results] = await db.promise().query(sql, [searchQuery, searchQuery]);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Register a new visitor
router.post('/register/new', validateNewVisitor, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false,
        errors: errors.array(),
        message: 'Please check your input and try again.'
      });
    }

    console.log('Received registration data:', req.body);
    const { name, email, phone, reason, staff_email } = req.body;

    // Check if any required fields are missing
    if (!name || !email || !phone || !reason || !staff_email) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    // Check if visitor already exists
    const [existingVisitor] = await db.promise().query(
      'SELECT id FROM visitors WHERE email = ?',
      [email]
    );
    console.log('Existing visitor check:', existingVisitor);

    let visitorId;
    if (existingVisitor.length) {
      visitorId = existingVisitor[0].id;
      console.log('Updating existing visitor:', visitorId);
      // Update visitor info
      await db.promise().query(
        'UPDATE visitors SET name = ?, phone = ? WHERE id = ?',
        [name, phone, visitorId]
      );
    } else {
      console.log('Creating new visitor');
      // Create new visitor
      const [result] = await db.promise().query(
        'INSERT INTO visitors(name, email, phone) VALUES (?, ?, ?)',
        [name, email, phone]
      );
      visitorId = result.insertId;
      console.log('New visitor created with ID:', visitorId);
    }

    // Create visit record
    console.log('Creating visit record');
    await db.promise().query(
      'INSERT INTO visits(visitor_id, staff_email, reason) VALUES (?, ?, ?)',
      [visitorId, staff_email, reason]
    );

    // Skip email sending for now to isolate the issue
    /*
    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: staff_email,
      subject: 'New Visitor Request',
      html: `...`
    };

    await transporter.sendMail(mailOptions);
    */
    
    console.log('Registration successful');
    res.json({ success: true, message: 'Registration successful' });
  } catch (error) {
    console.error('Detailed registration error:', {
      message: error.message,
      stack: error.stack,
      sqlMessage: error.sqlMessage,
      code: error.code
    });
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
});

// Register a returning visitor
router.post('/register/returning', validateReturningVisitor, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { visitor_id, reason, staff_email } = req.body;

    // Verify visitor exists
    const [visitor] = await db.promise().query(
      'SELECT name, email, phone FROM visitors WHERE id = ?',
      [visitor_id]
    );

    if (!visitor.length) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    // Create visit record
    await db.promise().query(
      'INSERT INTO visits(visitor_id, staff_email, reason) VALUES (?, ?, ?)',
      [visitor_id, staff_email, reason]
    );

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: staff_email,
      subject: 'New Visitor Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Visitor Request</h2>
          <p><strong>${visitor[0].name}</strong> would like to meet with you.</p>
          <p><strong>Contact:</strong><br>
          Email: ${visitor[0].email}<br>
          Phone: ${visitor[0].phone}</p>
          <p><strong>Reason:</strong><br>${reason}</p>
          <div style="margin: 30px 0;">
            <a href="${process.env.BASE_URL || 'http://localhost:3000'}/respond?email=${encodeURIComponent(staff_email)}&status=allowed" 
               style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">
               ✅ Allow
            </a>
            <a href="${process.env.BASE_URL || 'http://localhost:3000'}/respond?email=${encodeURIComponent(staff_email)}&status=denied" 
               style="background: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
               ❌ Deny
            </a>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Response handler
router.get('/respond', async (req, res) => {
  try {
    const { email, status } = req.query;

    if (!email || !['allowed', 'denied'].includes(status)) {
      return res.status(400).send("Invalid response link.");
    }

    await db.promise().query(
      'UPDATE visits SET status = ? WHERE staff_email = ? ORDER BY id DESC LIMIT 1',
      [status, email]
    );

    res.render('response', { status });
  } catch (error) {
    console.error('Response error:', error);
    res.status(500).send("An error occurred while processing your response.");
  }
});

// Check-out visitor
router.post('/checkout/:visitId', async (req, res) => {
  try {
    await db.promise().query(
      'UPDATE visits SET check_out_time = CURRENT_TIMESTAMP WHERE id = ? AND check_out_time IS NULL',
      [req.params.visitId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

// Dashboard (protected route)
router.get('/dashboard', async (req, res) => {
  try {
    const [visits] = await db.promise().query(`
      SELECT 
        v.name,
        v.email,
        v.phone,
        vs.staff_email,
        vs.reason,
        vs.status,
        vs.check_in_time,
        vs.check_out_time,
        vs.id as visit_id
      FROM visits vs 
      JOIN visitors v ON vs.visitor_id = v.id 
      ORDER BY vs.check_in_time DESC
    `);
    
    res.render('dashboard', { visits });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send("An error occurred while loading the dashboard.");
  }
});

module.exports = router;
