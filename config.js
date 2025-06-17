require('dotenv').config();

// Ensure BASE_URL has proper protocol
const getBaseUrl = () => {
  const baseUrl = process.env.BASE_URL || 'visitors-attendance-app-production.up.railway.app';
  if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
    return baseUrl;
  }
  return `https://${baseUrl}`;
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