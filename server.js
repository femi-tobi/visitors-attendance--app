const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const visitorRoutes = require('./routes/visitor');
const cors = require('cors');
app.use(cors());

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use('/', visitorRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/submit', (req, res) => {
  const { name, email, phone, staff_email, reason } = req.body;
  console.log('Visitor submitted:', { name, email, phone, staff_email, reason });
  res.send('Form submitted successfully');
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
