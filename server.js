require('dns').setDefaultResultOrder('ipv4first');
const express = require('express');
const path = require('path');
const config = require('./config');
const visitorRoutes = require('./routes/visitor');
const adminRoutes = require('./routes/admin');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');

const app = express();

app.set('trust proxy', 1);
// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Routes
const server = http.createServer(app);
const io = new Server(server);
const visitorRouter = require('./routes/visitor')(io);
app.use('/visitor', visitorRouter);
app.use('/admin', adminRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.post('/submit', (req, res) => {
  const { name, email, phone, staff_email, reason } = req.body;
  res.send('Form submitted successfully');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { message: 'Something broke!' });
});

const PORT = config.server.port || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the application`);
});
