const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'tobi',
  database: 'visitor_app'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    throw err;
  }
  console.log('MySQL Connected');
});

module.exports = db;

const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'tramway.proxy.rlwy.net',
  user: 'root',
  password: 'PGEaxsWNIsOYJJzdSCoAraQyYroBTKRe',
  database: 'railway',
  port: 58336,
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    throw err;
  }
  console.log('Connected to Railway MySQL database');
});

module.exports = connection;
