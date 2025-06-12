-- Create visitors table
CREATE TABLE IF NOT EXISTS visitors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    photo_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create visits table
CREATE TABLE IF NOT EXISTS visits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_id INT NOT NULL,
    staff_email VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'allowed', 'denied') DEFAULT 'pending',
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP NULL,
    FOREIGN KEY (visitor_id) REFERENCES visitors(id),
    INDEX idx_staff_email (staff_email),
    INDEX idx_check_in_time (check_in_time)
); 