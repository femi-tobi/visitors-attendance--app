const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

module.exports = (io) => {
  const router = express.Router();

  const upload = multer();
  const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  });

  // Nodemailer config
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-specific-password',
    },
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
      .withMessage(
        'Please provide a reason for your visit (minimum 5 characters)'
      )
      .escape(),
    body('staff_email')
      .isEmail()
      .withMessage('Please enter a valid staff email address')
      .normalizeEmail(),
  ];

  // Validation middleware for returning visitors
  const validateReturningVisitor = [
    body('visitor_id')
      .notEmpty()
      .withMessage('Visitor ID is required')
      .isInt({ min: 1 })
      .withMessage('Visitor ID must be a valid number'),
    body('reason')
      .trim()
      .notEmpty()
      .withMessage('Reason for visit is required')
      .isLength({ min: 5 })
      .withMessage('Reason must be at least 5 characters long'),
    body('staff_email')
      .notEmpty()
      .withMessage('Staff email is required')
      .isEmail()
      .withMessage('Please enter a valid staff email address')
      .normalizeEmail(),
  ];

  // Serve the form
  router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/index.html'));
  });

  // Search for existing visitor
  router.get('/search', async (req, res) => {
    const { query } = req.query;
    try {
      const sql = `
      SELECT v.id, v.name, v.email, v.phone, v.company_name,
        (SELECT visitor_type FROM visits WHERE visitor_id = v.id ORDER BY id DESC LIMIT 1) as visitor_type
      FROM visitors v
      WHERE v.name LIKE ? OR v.email LIKE ?
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

  // Search staff members
  router.get('/search-staff', async (req, res) => {
    try {
      const query = req.query.query || '';
      if (query.length < 2) {
        return res.json([]);
      }

      const [staff] = await db
        .promise()
        .query('SELECT name, email FROM staff WHERE name LIKE ? LIMIT 5', [
          `%${query}%`,
        ]);

      res.json(staff);
    } catch (error) {
      console.error('Staff search error:', error);
      res.status(500).json({ error: 'Staff search failed' });
    }
  });

  // Register a new visitor
  router.post(
    '/register/new',
    upload.none(),
    validateNewVisitor,
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          console.log('Validation errors:', errors.array());
          return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: 'Please check your input and try again.',
          });
        }

        console.log('Received registration data:', req.body);
        const {
          name,
          email,
          phone,
          reason,
          staff_email,
          photo,
          visitorType,
          visitor_company_name,
          visitor_company_address,
          contractor_company_name,
          contractor_company_address,
          contractor_work_site,
          contractor_project_detail,
          contractor_supervising_department,
          supplier_company_name,
          supplier_company_address,
          supplier_material_supplied,
          supplier_receiving_department,
        } = req.body;

        // Determine company name and address based on visitor type
        let company_name = '';
        let company_address = '';
        if (visitorType === 'visitor') {
          company_name = visitor_company_name;
          company_address = visitor_company_address;
        } else if (visitorType === 'contractor') {
          company_name = contractor_company_name;
          company_address = contractor_company_address;
        } else if (visitorType === 'supplier') {
          company_name = supplier_company_name;
          company_address = supplier_company_address;
        }

        // Check if any required fields are missing
        if (!name || !email || !phone || !reason || !staff_email || !photo) {
          return res.status(400).json({
            success: false,
            error: 'All fields including photo are required',
          });
        }

        // Validate base64 image
        if (!photo.startsWith('data:image/')) {
          return res.status(400).json({
            success: false,
            error: 'Invalid image format. Please provide a valid image.',
          });
        }

        // Save photo
        const photoData = photo.replace(/^data:image\/\w+;base64,/, '');
        try {
          const photoBuffer = Buffer.from(photoData, 'base64');
          if (photoBuffer.length === 0) {
            return res.status(400).json({
              success: false,
              error: 'Invalid image data. Please take a photo again.',
            });
          }
          const photoFileName = `${Date.now()}-${email.replace(
            /[^a-zA-Z0-9]/g,
            '_'
          )}.jpg`;
          const photoPath = path.join(uploadsDir, photoFileName);

          await fs.promises.writeFile(photoPath, photoBuffer);
          const publicPhotoPath = `/uploads/${photoFileName}`;

          // Check if visitor already exists
          const [existingVisitor] = await db
            .promise()
            .query('SELECT id FROM visitors WHERE email = ?', [email]);
          console.log('Existing visitor check:', existingVisitor);

          let visitorId;
          if (existingVisitor.length) {
            visitorId = existingVisitor[0].id;
            console.log('Updating existing visitor:', visitorId);
            // Update visitor info
            await db
              .promise()
              .query(
                'UPDATE visitors SET name = ?, phone = ?, photo_path = ?, company_name = ?, company_address = ? WHERE id = ?',
                [
                  name,
                  phone,
                  publicPhotoPath,
                  company_name,
                  company_address,
                  visitorId,
                ]
              );
          } else {
            console.log('Creating new visitor');
            // Create new visitor
            const [result] = await db
              .promise()
              .query(
                'INSERT INTO visitors(name, email, phone, photo_path, company_name, company_address) VALUES (?, ?, ?, ?, ?, ?)',
                [
                  name,
                  email,
                  phone,
                  publicPhotoPath,
                  company_name,
                  company_address,
                ]
              );
            visitorId = result.insertId;
            console.log('New visitor created with ID:', visitorId);
          }

          // Create visit record
          console.log('Creating visit record');
          const [visitResult] = await db
            .promise()
            .query(
              'INSERT INTO visits(visitor_id, staff_email, reason, visitor_type) VALUES (?, ?, ?, ?)',
              [visitorId, staff_email, reason, visitorType]
            );
          const visitId = visitResult.insertId;

          // Insert type-specific details
          if (visitorType === 'contractor') {
            await db
              .promise()
              .query(
                'INSERT INTO contractor_visit_details(visit_id, work_site, project_detail, supervising_department) VALUES (?, ?, ?, ?)',
                [
                  visitId,
                  contractor_work_site,
                  contractor_project_detail,
                  contractor_supervising_department,
                ]
              );
          } else if (visitorType === 'supplier') {
            await db
              .promise()
              .query(
                'INSERT INTO supplier_visit_details(visit_id, material_supplied, receiving_department) VALUES (?, ?, ?)',
                [
                  visitId,
                  supplier_material_supplied,
                  supplier_receiving_department,
                ]
              );
          }

          // Send email
          const mailOptions = {
            from: process.env.EMAIL_USER || 'your-email@gmail.com',
            to: staff_email,
            subject: 'New Visitor Request',
            html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Visitor Request</h2>
            <p><strong>${name}</strong> would like to meet with you.</p>
            <p><strong>Contact:</strong><br>
            Email: ${email}<br>
            Phone: ${phone}</p>
            <p><strong>Reason:</strong><br>${reason}</p>
            <p><em>Visitor's photo is attached to this email.</em></p>
            <div style="margin: 30px 0;">
              <a href="${
                config.app.baseUrl
              }/visitor/respond?email=${encodeURIComponent(
              staff_email
            )}&status=allowed" 
                 style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">
                 ✅ Allow
              </a>
              <a href="${
                config.app.baseUrl
              }/visitor/respond?email=${encodeURIComponent(
              staff_email
            )}&status=denied" 
                 style="background: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                 ❌ Deny
              </a>
            </div>
          </div>
        `,
            attachments: [
              {
                filename: `visitor_${name.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`,
                path: photoPath,
                cid: 'visitor-photo',
              },
            ],
          };

          await transporter.sendMail(mailOptions);

          console.log('Registration successful');
          res.json({ success: true, message: 'Registration successful' });
        } catch (dbError) {
          console.error('Database or file system error:', dbError);
          res.status(500).json({
            success: false,
            error: 'Failed to process registration.',
          });
        }
      } catch (error) {
        console.error('Error in new registration route:', error);
        res.status(500).json({
          success: false,
          error: 'An unexpected error occurred.',
        });
      }
    }
  );

  // Register a returning visitor
  router.post(
    '/register/returning',
    upload.none(),
    validateReturningVisitor,
    async (req, res) => {
      try {
        console.log('Returning visitor registration data received:', req.body);
        console.log(
          'visitor_id:',
          req.body.visitor_id,
          'type:',
          typeof req.body.visitor_id
        );
        console.log(
          'reason:',
          req.body.reason,
          'length:',
          req.body.reason ? req.body.reason.length : 0
        );
        console.log('staff_email:', req.body.staff_email);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          console.log('Validation errors for returning visitor:', errors.array());
          return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: 'Please check your input and try again.',
          });
        }

        const { visitor_id, reason, staff_email } = req.body;

        // Verify visitor exists
        const [visitor] = await db
          .promise()
          .query('SELECT name, email, phone, photo_path FROM visitors WHERE id = ?', [
            visitor_id,
          ]);

        if (!visitor.length) {
          return res.status(404).json({ error: 'Visitor not found' });
        }

        // Create visit record
        await db
          .promise()
          .query(
            'INSERT INTO visits(visitor_id, staff_email, reason) VALUES (?, ?, ?)',
            [visitor_id, staff_email, reason]
          );

        // Prepare email attachments if photo exists
        const attachments = [];
        if (visitor[0].photo_path) {
          const photoPath = path.join(
            __dirname,
            '..',
            'public',
            visitor[0].photo_path
          );
          if (fs.existsSync(photoPath)) {
            attachments.push({
              filename: `visitor_${visitor[0].name.replace(
                /[^a-zA-Z0-9]/g,
                '_'
              )}.jpg`,
              path: photoPath,
              cid: 'visitor-photo',
            });
          }
        }

        // Send email
        const mailOptions = {
          from: process.env.EMAIL_USER || 'your-email@gmail.com',
          to: staff_email,
          subject: 'New Visitor Request',
          html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Visitor Request</h2>
          <p><strong>${
            visitor[0].name
          }</strong> would like to meet with you.</p>
          <p><strong>Contact:</strong><br>
          Email: ${visitor[0].email}<br>
          Phone: ${visitor[0].phone}</p>
          <p><strong>Reason:</strong><br>${reason}</p>
          ${
            attachments.length > 0
              ? "<p><em>Visitor's photo is attached to this email.</em></p>"
              : ''
          }
          <div style="margin: 30px 0;">
            <a href="${
              config.app.baseUrl
            }/visitor/respond?email=${encodeURIComponent(
            staff_email
          )}&status=allowed" 
               style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">
               ✅ Allow
            </a>
            <a href="${
              config.app.baseUrl
            }/visitor/respond?email=${encodeURIComponent(
            staff_email
          )}&status=denied" 
               style="background: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
               ❌ Deny
            </a>
          </div>
        </div>
      `,
          attachments: attachments,
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Registration successful' });
      } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
      }
    }
  );

  // Response handler
  router.get('/respond', async (req, res) => {
    try {
      const { email, status } = req.query;

      if (!email || !['allowed', 'denied'].includes(status)) {
        return res.status(400).send('Invalid response link.');
      }

      console.log('Response handler called with:', { email, status });
      console.log('Current baseUrl:', config.app.baseUrl);
      console.log('Request headers:', req.headers.host);
      console.log('Request protocol:', req.protocol);

      // Update visit status
      await db
        .promise()
        .query(
          'UPDATE visits SET status = ? WHERE staff_email = ? ORDER BY id DESC LIMIT 1',
          [status, email]
        );

      // Get visitor details to send notification
      const [visitDetails] = await db.promise().query(
        `
      SELECT v.name, v.email, v.phone, vs.reason, vs.staff_email
      FROM visits vs 
      JOIN visitors v ON vs.visitor_id = v.id 
      WHERE vs.staff_email = ? 
      ORDER BY vs.id DESC 
      LIMIT 1
    `,
        [email]
      );

      if (visitDetails.length > 0) {
        const visitor = visitDetails[0];
        const statusText = status === 'allowed' ? 'APPROVED' : 'DENIED';
        const statusColor = status === 'allowed' ? '#4CAF50' : '#f44336';
        const statusEmoji = status === 'allowed' ? '✅' : '❌';

        // Emit real-time notification to admins
        if (io) {
          io.emit('visit-status', {
            staff: visitor.staff_email,
            visitor: visitor.name,
            status: statusText,
          });
        }

        // Send notification email to visitor
        const visitorMailOptions = {
          from: process.env.EMAIL_USER || 'your-email@gmail.com',
          to: visitor.email,
          subject: `Your Visit Request has been ${statusText}`,
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${statusEmoji} Visit Request ${statusText}</h2>
            <p>Dear <strong>${visitor.name}</strong>,</p>
            <p>Your visit request has been <strong style="color: ${statusColor};">${statusText}</strong>.</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Visit Details:</h3>
              <p><strong>Staff Member:</strong> ${visitor.staff_email}</p>
              <p><strong>Reason for Visit:</strong> ${visitor.reason}</p>
              <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
            </div>
            
            <p>Thank you for using our visitor management system.</p>
          </div>
        `,
        };
        await transporter.sendMail(visitorMailOptions);

        res.render('response', {
          status: statusText,
          status_color: statusColor,
          message: `The visitor has been notified of your decision.`,
        });
      } else {
        res.status(404).render('response', {
          status: 'Error',
          status_color: '#f44336',
          message:
            'Could not find a matching visit request. It may have been updated already.',
        });
      }
    } catch (error) {
      console.error('Response handler error:', error);
      res.status(500).render('response', {
        status: 'Server Error',
        status_color: '#f44336',
        message: 'An error occurred while processing your response.',
      });
    }
  });

  // Check-in route (example - to be implemented)
  router.post('/checkin', (req, res) => {
    // Logic for visitor check-in
    res.send('Check-in successful');
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
      res.status(500).send('An error occurred while loading the dashboard.');
    }
  });

  return router;
};
