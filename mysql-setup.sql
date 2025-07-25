-- MySQL Database and Table Setup Script for No-Llamar API Cache
-- This script creates the database and table structure needed for MySQL caching
-- The MySQLCacheService will automatically run these commands when needed,
-- but this script can be used for manual setup or reference

-- Create database (if it doesn't exist)
CREATE DATABASE IF NOT EXISTS `no_llamar_cache` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Use the database
USE `no_llamar_cache`;

-- Create the phone cache table
CREATE TABLE IF NOT EXISTS `phone_cache` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `phone_number` VARCHAR(20) NOT NULL,
  `cache_data` JSON NOT NULL,
  `timestamp` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  UNIQUE KEY `unique_phone` (`phone_number`),
  KEY `idx_phone_number` (`phone_number`),
  KEY `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Show the table structure
DESCRIBE `phone_cache`;

-- Show current cache statistics
SELECT 
  COUNT(*) as total_entries,
  MIN(`timestamp`) as oldest_entry,
  MAX(`timestamp`) as newest_entry,
  COUNT(CASE WHEN `timestamp` >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as valid_entries,
  COUNT(CASE WHEN `timestamp` < DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as expired_entries
FROM `phone_cache`;

-- Example queries for testing

-- Insert a test cache entry
-- INSERT INTO `phone_cache` (`phone_number`, `cache_data`, `timestamp`) 
-- VALUES ('099123456', '{"data": {"response": "Test response", "isInRecord": false}, "phoneNumber": "099123456"}', NOW());

-- Get a cached entry
-- SELECT * FROM `phone_cache` WHERE `phone_number` = '099123456';

-- Delete expired entries manually
-- DELETE FROM `phone_cache` WHERE `timestamp` < DATE_SUB(NOW(), INTERVAL 24 HOUR);

-- Clear all cache
-- DELETE FROM `phone_cache`;

-- Drop the cleanup event (if needed)
-- DROP EVENT IF EXISTS `cleanup_expired_cache`;

-- Drop the table (if needed)
-- DROP TABLE IF EXISTS `phone_cache`;

-- Drop the database (if needed)
-- DROP DATABASE IF EXISTS `no_llamar_cache`;
