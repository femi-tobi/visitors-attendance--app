CREATE DATABASE IF NOT EXISTS visitor_app;
USE visitor_app;

CREATE TABLE IF NOT EXISTS visitors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_name (name)
);

CREATE TABLE IF NOT EXISTS visits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  visitor_id INT NOT NULL,
  staff_email VARCHAR(100) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'allowed', 'denied') DEFAULT 'pending',
  check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  check_out_time DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (visitor_id) REFERENCES visitors(id),
  INDEX idx_staff_email (staff_email),
  INDEX idx_status (status),
  INDEX idx_check_in_time (check_in_time)
);

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);
