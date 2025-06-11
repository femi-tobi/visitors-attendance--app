require('dotenv').config();

module.exports = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'visitor_app',
    port: process.env.DB_PORT || 3306
  },
  server: {
    port: process.env.PORT || 3000
  },
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  app: {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    sessionSecret: process.env.SESSION_SECRET || 'your-secret-key'
  }
}; 