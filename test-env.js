require('dotenv').config();

console.log('=== ENVIRONMENT VARIABLES TEST ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? 'SET' : 'NOT SET');
console.log('BASE_URL:', process.env.BASE_URL || 'NOT SET');

console.log('\n=== ADMIN CREDENTIALS TEST ===');
console.log('ADMIN_USERNAME:', process.env.ADMIN_USERNAME || 'NOT SET');
console.log('ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? 'SET (length: ' + process.env.ADMIN_PASSWORD.length + ')' : 'NOT SET');

console.log('\n=== LOGIN TEST ===');
const testUsername = 'admin';
const testPassword = 'admin123';

console.log('Testing with:');
console.log('Username:', testUsername);
console.log('Password:', testPassword);

console.log('\nExpected vs Actual:');
console.log('Username match:', testUsername === process.env.ADMIN_USERNAME);
console.log('Password match:', testPassword === process.env.ADMIN_PASSWORD);

if (testUsername === process.env.ADMIN_USERNAME && testPassword === process.env.ADMIN_PASSWORD) {
  console.log('\n✅ LOGIN SHOULD WORK!');
} else {
  console.log('\n❌ LOGIN WILL FAIL!');
  console.log('Please set these environment variables in Railway:');
  console.log('ADMIN_USERNAME=admin');
  console.log('ADMIN_PASSWORD=admin123');
} 