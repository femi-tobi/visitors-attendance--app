const db = require('./db');

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const [testResult] = await db.promise().query('SELECT 1 as test');
    console.log('✅ Database connection successful:', testResult);
    
    // Check tables
    const [tables] = await db.promise().query('SHOW TABLES');
    console.log('📋 Available tables:', tables);
    
    // Check visitors table structure
    const [visitorColumns] = await db.promise().query('DESCRIBE visitors');
    console.log('👥 Visitors table structure:', visitorColumns);
    
    // Check visits table structure
    const [visitColumns] = await db.promise().query('DESCRIBE visits');
    console.log('📝 Visits table structure:', visitColumns);
    
    // Check staff table structure
    const [staffColumns] = await db.promise().query('DESCRIBE staff');
    console.log('👨‍💼 Staff table structure:', staffColumns);
    
    // Test basic queries
    const [visitorCount] = await db.promise().query('SELECT COUNT(*) as count FROM visitors');
    console.log('👥 Visitor count:', visitorCount[0].count);
    
    const [visitCount] = await db.promise().query('SELECT COUNT(*) as count FROM visits');
    console.log('📝 Visit count:', visitCount[0].count);
    
    const [staffCount] = await db.promise().query('SELECT COUNT(*) as count FROM staff');
    console.log('👨‍💼 Staff count:', staffCount[0].count);
    
    console.log('✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('Error stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testDatabase(); 