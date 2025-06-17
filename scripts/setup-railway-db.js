const db = require('../db');

async function setupRailwayDatabase() {
  try {
    console.log('Setting up Railway database tables...');
    
    // Create staff table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS staff (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_staff_name (name),
        INDEX idx_staff_email (email)
      )
    `);
    console.log('✅ Staff table created/verified');
    
    // Create visitors table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS visitors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        photo_path VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_name (name)
      )
    `);
    console.log('✅ Visitors table created/verified');
    
    // Create visits table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS visits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        visitor_id INT NOT NULL,
        staff_email VARCHAR(100) NOT NULL,
        reason TEXT NOT NULL,
        status ENUM('pending', 'allowed', 'denied') DEFAULT 'pending',
        check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        check_out_time DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_staff_email (staff_email),
        INDEX idx_status (status),
        INDEX idx_check_in_time (check_in_time)
      )
    `);
    console.log('✅ Visits table created/verified');
    
    // Test the staff table
    const [staffCount] = await db.promise().query('SELECT COUNT(*) as count FROM staff');
    console.log(`📊 Staff table has ${staffCount[0].count} records`);
    
    // Add a sample staff member if table is empty
    if (staffCount[0].count === 0) {
      await db.promise().execute(
        'INSERT INTO staff (name, email) VALUES (?, ?)',
        ['Sample Staff', 'staff@example.com']
      );
      console.log('✅ Added sample staff member');
    }
    
    console.log('🎉 Railway database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  } finally {
    db.end();
  }
}

setupRailwayDatabase(); 