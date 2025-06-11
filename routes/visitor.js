const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');

// Nodemailer config
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your_email@gmail.com',
    pass: 'your_app_password'
  }
});

// Serve the form
router.get('/', (req, res) => {
  res.sendFile('index.html', { root: './views' });
});

// Register a visitor
router.post('/register', (req, res) => {
  const { name, email, phone, reason, staff_email } = req.body;

  if (!name || !email || !phone || !reason || !staff_email) {
    return res.redirect('/failure.html');
  }

  db.query('SELECT id FROM visitors WHERE email = ?', [email], (err, result) => {
    if (err) {
      console.error(err);
      return res.redirect('/failure.html');
    }

    const visitorId = result.length ? result[0].id : null;

    const registerVisit = (id) => {
      const visitData = [id, staff_email, reason];
      db.query('INSERT INTO visits(visitor_id, staff_email, reason) VALUES (?, ?, ?)', visitData, (err) => {
        if (err) {
          console.error(err);
          return res.redirect('/failure.html');
        }

        const mailOptions = {
          from: 'your_email@gmail.com',
          to: staff_email,
          subject: 'New Visitor Request',
          html: `
            <p>${name} wants to see you.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <a href="http://localhost:3000/respond?email=${staff_email}&status=allowed">✅ Allow</a> |
            <a href="http://localhost:3000/respond?email=${staff_email}&status=denied">❌ Deny</a>
          `
        };

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            console.error(err);
            return res.redirect('/failure.html');
          }
          res.redirect('/success.html');
        });
      });
    };

    if (!visitorId) {
      db.query('INSERT INTO visitors(name, email, phone) VALUES (?, ?, ?)', [name, email, phone], (err, result) => {
        if (err) {
          console.error(err);
          return res.redirect('/failure.html');
        }
        registerVisit(result.insertId);
      });
    } else {
      registerVisit(visitorId);
    }
  });
});

// Response handler
router.get('/respond', (req, res) => {
  const { email, status } = req.query;

  if (!email || !status) {
    return res.send("Invalid response link.");
  }

  db.query(
    'UPDATE visits SET status = ? WHERE staff_email = ? ORDER BY id DESC LIMIT 1',
    [status, email],
    (err) => {
      if (err) {
        console.error(err);
        return res.send("An error occurred while processing your response.");
      }
      res.send(`Visitor access <strong>${status}</strong>`);
    }
  );
});

// Dashboard
router.get('/dashboard', (req, res) => {
  const sql = `
    SELECT 
      v.name, 
      v.email, 
      vs.staff_email, 
      vs.reason, 
      vs.status, 
      vs.visit_time 
    FROM visits vs 
    JOIN visitors v ON vs.visitor_id = v.id 
    ORDER BY vs.id DESC
  `;
  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.send("Dashboard error.");
    }
    res.render('dashboard', { visits: result });
  });
});

module.exports = router;
