require('dotenv').config();
const mysql = require('mysql2');

// Use connection pool for better stability with remote databases
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'tramway.proxy.rlwy.net',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'qmXVvvEmWvavzTdcXiFdjqvILiVWWmMz',
  database: process.env.DB_NAME || 'railway',
  port: process.env.DB_PORT || 27380,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 60000, // 60 seconds
  acquireTimeout: 60000,
  timeout: 60000
});

// Test the database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    console.error('Please check your Railway database credentials and network connection');
    return;
  }
  console.log('✅ MySQL Connected successfully to Railway database');
  connection.release();
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('MySQL Pool Error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('⚠️ Database connection was lost. Pool will reconnect automatically.');
  }
});

module.exports = pool;
