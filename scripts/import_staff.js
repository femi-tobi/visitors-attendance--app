const fs = require('fs');
const csv = require('csv-parse/sync'); // Using sync parser for simplicity
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../config');

async function importStaffFromCSV(filePath) {
  try {
    // Create database connection
    const connection = await mysql.createConnection({
      host: config.db.host,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database
    });

    console.log('Connected to database successfully');

    // Read CSV file content
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Parse CSV content
    const records = csv.parse(fileContent, {
      skip_empty_lines: true,
      trim: true,
      skipRecordsWithError: true,
      relaxColumnCount: true
    });

    console.log('Parsed CSV file successfully');
    
    // Filter and clean records
    const validRecords = records
      .filter(record => {
        // Skip if less than 2 columns
        if (!record || record.length < 2) {
          return false;
        }
        
        // Skip header rows and empty rows
        if (!record[1] || record[1] === 'Employee Name' || record[1] === '') {
          return false;
        }
        
        const name = record[1];
        const email = record[2];
        
        // Skip if no email
        if (!email) {
          console.log(`Skipping record with no email: ${name}`);
          return false;
        }
        
        // Basic email validation
        if (!email.includes('@')) {
          console.log(`Skipping invalid email for ${name}: ${email}`);
          return false;
        }
        
        return true;
      })
      .map(record => ({
        name: record[1].trim(),
        email: record[2].trim()
      }));

    console.log(`Found ${validRecords.length} valid records in CSV file`);

    // Import records
    let imported = 0;
    let skipped = 0;

    for (const record of validRecords) {
      try {
        await connection.execute(
          'INSERT INTO staff (name, email) VALUES (?, ?)',
          [record.name, record.email]
        );
        console.log(`Imported: ${record.name} (${record.email})`);
        imported++;
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`Skipping duplicate email: ${record.email}`);
          skipped++;
        } else {
          console.error(`Error importing record:`, record, error);
          skipped++;
        }
      }
    }

    console.log(`\nImport completed:`);
    console.log(`- Imported: ${imported} records`);
    console.log(`- Skipped: ${skipped} records`);

    await connection.end();
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

// Check if file path is provided
if (process.argv.length < 3) {
  console.log('Usage: node import_staff.js <path-to-csv-file>');
  console.log('CSV file should be in the format: S/N NO, Name, Email');
  process.exit(1);
}

const filePath = path.resolve(process.argv[2]);

// Check if file exists
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

importStaffFromCSV(filePath); 