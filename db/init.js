const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
const config = require('../config');

async function initializeDatabase() {
  // First connection to create database
  const initialConnection = mysql.createConnection({
    host: config.db.host || 'localhost',
    user: config.db.user || 'root',
    password: config.db.password || '',
    multipleStatements: true
  });

  try {
    // Read the schema file
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

    // Create database if it doesn't exist
    console.log('Creating database...');
    await initialConnection.promise().query(`CREATE DATABASE IF NOT EXISTS ${config.db.database}`);
    console.log('Database created or already exists');

    // Close initial connection
    initialConnection.end();

    // Create new connection with database selected
    const dbConnection = mysql.createConnection({
      host: config.db.host || 'localhost',
      user: config.db.user || 'root',
      password: config.db.password || '',
      database: config.db.database,
      multipleStatements: true
    });

    // Use the database and create tables
    console.log('Creating tables...');
    await dbConnection.promise().query(schema);
    console.log('Database tables created successfully');

    // Close connection
    dbConnection.end();
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    if (initialConnection) initialConnection.end();
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase(); 