const mysql = require('mysql2');
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'tobi',
  database: 'visitor_app'
});

db.connect((err) => {
  if (err) throw err;
  console.log('MySQL Connected');
});
module.exports = db;
