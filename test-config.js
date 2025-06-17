require('dotenv').config();
const config = require('./config');

console.log('=== Configuration Test ===');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('BASE_URL from env:', process.env.BASE_URL);
console.log('Config app baseUrl:', config.app.baseUrl);
console.log('Final URL that will be used:', config.app.baseUrl);
console.log('========================'); 