require('dotenv').config();

// Debug environment variables
console.log('Environment Debug Info:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('BASE_URL from env:', process.env.BASE_URL);
console.log('PORT:', process.env.PORT);

// Ensure BASE_URL has proper protocol
const getBaseUrl = () => {
  // Check if we're in production environment
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production';
  
  console.log('Is Production:', isProduction);
  
  // If in production and no BASE_URL is set, use the Railway URL
  if (isProduction && !process.env.BASE_URL) {
    console.log('Using default Railway URL');
    return 'https://visitors-attendance-app-production.up.railway.app';
  }
  
  const baseUrl = process.env.BASE_URL || 'visitors-attendance-app-production.up.railway.app';
  if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
    console.log('Using BASE_URL with protocol:', baseUrl);
    return baseUrl;
  }
  const finalUrl = `https://${baseUrl}`;
  console.log('Using BASE_URL with added protocol:', finalUrl);
  return finalUrl;
};

module.exports = {
  db: {
    host: process.env.DB_HOST || 'tramway.proxy.rlwy.net',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'qmXVvvEmWvavzTdcXiFdjqvILiVWWmMz',
    database: process.env.DB_NAME || 'railway',
    port: process.env.DB_PORT || 27380
  },
  server: {
    port: process.env.PORT || 3000
  },
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  app: {
    baseUrl: getBaseUrl(),
    sessionSecret: process.env.SESSION_SECRET || 'your-secret-key'
  }
}; 