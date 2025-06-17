const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('./db');

const results = [];

fs.createReadStream(path.join(__dirname, 'staff.csv'))
  .pipe(csv({
    mapHeaders: ({ header }) => header.trim().toLowerCase()
  }))
  .on('data', (data) => {
    const name = data.name?.trim();
    const email = data.email?.trim();

    if (name && email) {
      results.push({ name, email });
    }
  })
  .on('end', () => {
    results.forEach((staff) => {
      const sql = 'INSERT INTO staff (name, email) VALUES (?, ?)';
      db.query(sql, [staff.name, staff.email], (err, result) => {
        if (err) {
          console.error(`❌ Error inserting ${staff.name}:`, err.message);
        } else {
          console.log(`✅ Inserted ${staff.name} with ID: ${result.insertId}`);
        }
      });
    });
  });
