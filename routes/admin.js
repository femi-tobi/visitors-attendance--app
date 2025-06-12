const express = require('express');
const router = express.Router();
const db = require('../db');
const { body, validationResult } = require('express-validator');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.session || !req.session.isAdmin) {
    return res.redirect('/admin/login');
  }
  next();
};

// Admin login page
router.get('/login', (req, res) => {
  res.render('admin/login');
});

// Admin login handler
router.post('/login', [
  body('username').trim().notEmpty(),
  body('password').trim().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('admin/login', { errors: errors.array() });
  }

  const { username, password } = req.body;
  
  // In a real application, you should use proper authentication
  // This is just a simple example
  if (username === process.env.ADMIN_USERNAME && 
      password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect('/admin/staff');
  } else {
    res.render('admin/login', { error: 'Invalid credentials' });
  }
});

// Admin logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Staff management page
router.get('/staff', isAdmin, async (req, res) => {
  try {
    const [staff] = await db.promise().query(
      'SELECT * FROM staff ORDER BY name'
    );
    res.render('admin/staff', { staff });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).render('error', { message: 'Failed to fetch staff list' });
  }
});

// Add new staff member
router.post('/staff', isAdmin, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const [staff] = await db.promise().query('SELECT * FROM staff ORDER BY name');
      return res.render('admin/staff', { 
        staff,
        errors: errors.array(),
        formData: req.body 
      });
    }

    const { name, email } = req.body;
    await db.promise().execute(
      'INSERT INTO staff (name, email) VALUES (?, ?)',
      [name, email]
    );

    res.redirect('/admin/staff');
  } catch (error) {
    console.error('Error adding staff:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      const [staff] = await db.promise().query('SELECT * FROM staff ORDER BY name');
      return res.render('admin/staff', {
        staff,
        errors: [{ msg: 'Email already exists' }],
        formData: req.body
      });
    }
    res.status(500).render('error', { message: 'Failed to add staff member' });
  }
});

// Edit staff member
router.post('/staff/:id', isAdmin, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const [staff] = await db.promise().query('SELECT * FROM staff ORDER BY name');
      return res.render('admin/staff', {
        staff,
        errors: errors.array(),
        formData: { ...req.body, id: req.params.id }
      });
    }

    const { name, email } = req.body;
    await db.promise().execute(
      'UPDATE staff SET name = ?, email = ? WHERE id = ?',
      [name, email, req.params.id]
    );

    res.redirect('/admin/staff');
  } catch (error) {
    console.error('Error updating staff:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      const [staff] = await db.promise().query('SELECT * FROM staff ORDER BY name');
      return res.render('admin/staff', {
        staff,
        errors: [{ msg: 'Email already exists' }],
        formData: { ...req.body, id: req.params.id }
      });
    }
    res.status(500).render('error', { message: 'Failed to update staff member' });
  }
});

// Delete staff member
router.post('/staff/:id/delete', isAdmin, async (req, res) => {
  try {
    await db.promise().execute(
      'DELETE FROM staff WHERE id = ?',
      [req.params.id]
    );
    res.redirect('/admin/staff');
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).render('error', { message: 'Failed to delete staff member' });
  }
});

module.exports = router; 