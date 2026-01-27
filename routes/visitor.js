const express = require('express');
const router = express.Router();
const db = require('../db');
const sgMail = require('@sendgrid/mail'); // SendGrid instead of nodemailer
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

  // SendGrid configuration
  sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
  
  // Email sender details
  const emailFrom = {
    email: process.env.SENDGRID_FROM_EMAIL || 'maynbaker2025@gmail.com',
    name: process.env.SENDGRID_FROM_NAME || 'Visitor Management System'
  };

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
          return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: 'Please check your input and try again.',
          });
        }

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

          let visitorId;
          if (existingVisitor.length) {
            visitorId = existingVisitor[0].id;
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
          }

          // Create visit record
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


          // Prepare email with SendGrid
          const photoDataBase64 = fs.readFileSync(photoPath).toString('base64');
          
          const mailData = {
            to: staff_email,
            from: emailFrom,
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
              <a href="${config.app.baseUrl}/visitor/respond?email=${encodeURIComponent(staff_email)}&status=allowed" 
                 style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">
                 ✅ Allow
              </a>
              <a href="${config.app.baseUrl}/visitor/respond?email=${encodeURIComponent(staff_email)}&status=denied" 
                 style="background: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                 ❌ Deny
              </a>
            </div>
          </div>
        `,
            attachments: [
              {
                content: photoDataBase64,
                filename: `visitor_${name.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`,
                type: 'image/jpeg',
                disposition: 'attachment'
              }
            ]
          };

          // Try to send email with SendGrid, but don't fail registration if email fails
          console.log(`📧 Attempting to send email to: ${staff_email} via SendGrid`);
          try {
            await Promise.race([
              sgMail.send(mailData),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Email timeout')), 10000)
              )
            ]);
            console.log('✅ ============================================');
            console.log('✅ EMAIL SENT SUCCESSFULLY via SendGrid');
            console.log(`✅ Recipient: ${staff_email}`);
            console.log(`✅ Visitor: ${name}`);
            console.log('✅ ============================================');
          } catch (emailError) {
            console.error('❌ ============================================');
            console.error('❌ EMAIL SENDING FAILED (Registration still successful)');
            console.error(`❌ Recipient: ${staff_email}`);
            console.error(`❌ Visitor: ${name}`);
            console.error(`❌ Error: ${emailError.message}`);
            if (emailError.response) {
              console.error(`❌ SendGrid Response:`, emailError.response.body);
            }
            console.error('❌ ============================================');
            // Don't throw - allow registration to continue
          }

          res.json({ 
            success: true, 
            message: 'Registration successful'
          });
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
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
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
        const sendgridAttachments = [];
        if (visitor[0].photo_path) {
          const photoPath = path.join(
            __dirname,
            '..',
            'public',
            visitor[0].photo_path
          );
          if (fs.existsSync(photoPath)) {
            const photoDataBase64 = fs.readFileSync(photoPath).toString('base64');
            sendgridAttachments.push({
              content: photoDataBase64,
              filename: `visitor_${visitor[0].name.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`,
              type: 'image/jpeg',
              disposition: 'attachment'
            });
          }
        }

        // Prepare email with SendGrid
        const mailData = {
          to: staff_email,
          from: emailFrom,
          subject: 'New Visitor Request',
          html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Visitor Request</h2>
          <p><strong>${visitor[0].name}</strong> would like to meet with you.</p>
          <p><strong>Contact:</strong><br>
          Email: ${visitor[0].email}<br>
          Phone: ${visitor[0].phone}</p>
          <p><strong>Reason:</strong><br>${reason}</p>
          ${sendgridAttachments.length > 0 ? "<p><em>Visitor's photo is attached to this email.</em></p>" : ''}
          <div style="margin: 30px 0;">
            <a href="${config.app.baseUrl}/visitor/respond?email=${encodeURIComponent(staff_email)}&status=allowed" 
               style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">
               ✅ Allow
            </a>
            <a href="${config.app.baseUrl}/visitor/respond?email=${encodeURIComponent(staff_email)}&status=denied" 
               style="background: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
               ❌ Deny
            </a>
          </div>
        </div>
      `,
          attachments: sendgridAttachments
        };

        // Try to send email with SendGrid, but don't fail registration if email fails  
        console.log(`📧 Attempting to send email to: ${staff_email} via SendGrid`);
        try {
          await Promise.race([
            sgMail.send(mailData),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Email timeout')), 10000)
            )
          ]);
          console.log('✅ ============================================');
          console.log('✅ EMAIL SENT SUCCESSFULLY via SendGrid (Returning Visitor)');
          console.log(`✅ Recipient: ${staff_email}`);
          console.log(`✅ Visitor: ${visitor[0].name}`);
          console.log('✅ ============================================');
        } catch (emailError) {
          console.error('❌ ============================================');
          console.error('❌ EMAIL SENDING FAILED (Registration still successful)');
          console.error(`❌ Recipient: ${staff_email}`);
          console.error(`❌ Visitor: ${visitor[0].name}`);
          console.error(`❌ Error: ${emailError.message}`);
          if (emailError.response) {
            console.error(`❌ SendGrid Response:`, emailError.response.body);
          }
          console.error('❌ ============================================');
          // Don't throw - allow registration to continue
        }

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

      // Update visit status
      await db
        .promise()
        .query(
          'UPDATE visits SET status = ? WHERE id = (SELECT id FROM (SELECT id FROM visits WHERE staff_email = ? ORDER BY id DESC LIMIT 1) AS sub)',
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
          status: status,  // Pass original status ('allowed' or 'denied') instead of statusText
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

  // Checkout route - Sign out a visitor
  router.post('/checkout/:id', async (req, res) => {
    try {
      const visitId = req.params.id;
      
      // Update the visit record with checkout time
      await db
        .promise()
        .query(
          'UPDATE visits SET check_out_time = NOW() WHERE id = ?',
          [visitId]
        );

      // Redirect back to admin dashboard
      res.redirect('/admin');
    } catch (error) {
      console.error('Checkout error:', error);
      res.status(500).send('An error occurred during checkout.');
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
      res.status(500).send('An error occurred while loading the dashboard.');
    }
  });

  return router;
};
