require('dotenv').config();
const mysql = require('mysql2');

// Test Railway connection
console.log('\n🔍 Testing Railway Database Connection...');
console.log('Host:', process.env.DB_HOST);
console.log('User:', process.env.DB_USER);
console.log('Database:', process.env.DB_NAME);
console.log('Port:', process.env.DB_PORT);
console.log('Password:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  connectTimeout: 30000
});

connection.connect((err) => {
  if (err) {
    console.error('\n❌ Connection Failed:', err.message);
    console.error('Error Code:', err.code);
    console.error('\nPossible issues:');
    console.error('1. Railway database service might be paused/stopped');
    console.error('2. Network firewall blocking the connection');
    console.error('3. Database credentials have changed');
    console.error('4. Railway service might have connection limits');
    process.exit(1);
  }
  
  console.log('\n✅ Connected successfully to Railway database!');
  
  // Test a simple query
  connection.query('SELECT 1 + 1 AS result', (error, results) => {
    if (error) {
      console.error('Query failed:', error);
      connection.end();
      process.exit(1);
    }
    
    console.log('✅ Query test successful:', results);
    console.log('\n🎉 Database connection is working!\n');
    connection.end();
    process.exit(0);
  });
});
