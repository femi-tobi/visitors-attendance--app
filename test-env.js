require('dotenv').config();

console.log('=== Environment Variables Test ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('ADMIN_USERNAME:', process.env.ADMIN_USERNAME);
console.log('ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? '***SET***' : 'NOT SET');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***SET***' : 'NOT SET');
console.log('BASE_URL:', process.env.BASE_URL);
console.log('===============================');

// Test admin authentication logic
const testUsername = 'admin';
const testPassword = 'admin123';

console.log('\n=== Admin Authentication Test ===');
console.log('Test username:', testUsername);
console.log('Test password:', testPassword);
console.log('Expected username:', process.env.ADMIN_USERNAME);
console.log('Expected password set:', process.env.ADMIN_PASSWORD ? 'YES' : 'NO');

if (testUsername === process.env.ADMIN_USERNAME && 
    testPassword === process.env.ADMIN_PASSWORD) {
  console.log('✅ Authentication would succeed');
} else {
  console.log('❌ Authentication would fail');
  console.log('Username match:', testUsername === process.env.ADMIN_USERNAME);
  console.log('Password match:', testPassword === process.env.ADMIN_PASSWORD);
}
console.log('================================'); 