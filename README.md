Visitor Attendance App 📝

A Node.js and MySQL-based web application for managing visitor registration, tracking, and staff notification via email.

🚀 Features

- Register new visitors with their name, email, phone number, and reason for visit
- Check if a visitor is already registered
- Notify the staff member via email with Allow/Deny links
- Track visit status (Allowed/Denied)
- Admin dashboard to view all visitor records

🛠 Tech Stack

- **Backend: Node.js, Express.js
- **Database: MySQL
- **Frontend: HTML + Tailwind CSS
- **Email: Nodemailer (Gmail)

⚙️ Installation & Setup

1. Clone the repository
   ```bash
   git clone https://github.com/femi-tobi/visitor-attendance-app.git
   cd visitor-attendance-app
   Install dependencies
2. Install dependencies
    npm install

3. Create the MySQL database

   CREATE DATABASE visitor_app;
   USE visitor_app;
   -- Paste content of mysql_schema.sql here or run:
   SOURCE mysql_schema.sql;

5. Configure database connection
   Update the db.js file with your MySQL credentials.

6. Setup Nodemailer
   In routes/visitor.js, replace:
   

   user: 'your_email@gmail.com',
   pass: 'your_app_password'
   with your actual Gmail and app password (use Gmail App Passwords).

7. Run the server
   npm run dev   # if you’re using nodemon
   or
   node server.js
   Visit the app
   Open in browser: http://localhost:3000

📄 Routes
GET / – Visitor registration form

POST /register – Submit a visitor

GET /respond?email=...&status=allowed|denied – Staff responds to request

GET /dashboard – Admin view of all visits

🧠 Future Improvements
Authentication for admin

Email templates

Pagination and filtering on dashboard

📮 Contact
For suggestions or issues, please reach out to [adefemioluwatobi13@gmail.com].

Built with ❤️ by Oluwatobi
