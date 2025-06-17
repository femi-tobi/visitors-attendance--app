require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'tramway.proxy.rlwy.net',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'qmXVvvEmWvavzTdcXiFdjqvILiVWWmMz',
  database: process.env.DB_NAME || 'railway',
  port: process.env.DB_PORT || 27380
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    throw err;
  }
  console.log('MySQL Connected');
});

module.exports = db;

const connection = mysql.createConnection({
  host: 'tramway.proxy.rlwy.net',
  user: 'root',
  password: 'qmXVvvEmWvavzTdcXiFdjqvILiVWWmMz',
  database: 'railway',
  port: 27380,
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    throw err;
  }
  console.log('Connected to Railway MySQL database');
});

module.exports = connection;
