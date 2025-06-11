CREATE DATABASE IF NOT EXISTS visitor_app;
USE visitor_app;

CREATE TABLE IF NOT EXISTS visitors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  visitor_id INT,
  staff_email VARCHAR(100),
  reason TEXT,
  status ENUM('pending', 'allowed', 'denied') DEFAULT 'pending',
  visit_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (visitor_id) REFERENCES visitors(id)
);
