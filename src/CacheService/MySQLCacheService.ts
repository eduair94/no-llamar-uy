import mysql from "mysql2/promise";
import { CachedResult, ICacheService } from "../CacheService.interface";
import { UrsecResponse } from "../PhoneChecker";

export interface MySQLConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  connectionLimit?: number;
  ssl?: any;
}

/**
 * MySQL cache service implementation
 * Follows Single Responsibility Principle - only handles caching operations using MySQL
 */
export class MySQLCacheService implements ICacheService {
  private pool: mysql.Pool | null = null;
  private readonly defaultMaxAgeHours = 24;
  private readonly cacheKeyPrefix = "phone-cache";
  private readonly tableName = "phone_cache";
  private readonly dbName: string;

  constructor(private readonly config?: MySQLConfig, private readonly maxAgeHours: number = 24) {
    // Setup configuration with environment variables as fallback
    this.config = {
      host: config?.host || process.env.MYSQL_HOST || "localhost",
      port: config?.port || parseInt(process.env.MYSQL_PORT || "3306"),
      user: config?.user || process.env.MYSQL_USER || "root",
      password: config?.password || process.env.MYSQL_PASSWORD || "",
      database: config?.database || process.env.MYSQL_DATABASE || "no_llamar_cache",
      connectionLimit: config?.connectionLimit || 10,
      ssl: config?.ssl || (process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: false } : false),
    };

    this.dbName = this.config.database || "no_llamar_cache";
  }

  /**
   * Initializes the MySQL connection pool if not already connected
   * @returns Promise<boolean> - True if connection successful, false otherwise
   */
  private async ensureConnection(): Promise<boolean> {
    try {
      if (!this.isCacheEnabled()) {
        console.log("🔄 MySQL configuration incomplete, skipping cache");
        return false;
      }

      if (this.pool) {
        // Test the connection
        const connection = await this.pool.getConnection();
        await connection.ping();
        connection.release();
        return true;
      }

      console.log("🔌 Connecting to MySQL...");

      // Create connection pool
      this.pool = mysql.createPool(this.config!);

      // Test the connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      // Ensure database exists
      await this.ensureDatabase();

      // Ensure table exists with proper schema
      await this.ensureTable();

      console.log("✅ Connected to MySQL successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to connect to MySQL:", error);
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      return false;
    }
  }

  /**
   * Ensures the database exists, creates it if it doesn't
   * @returns Promise<void>
   */
  private async ensureDatabase(): Promise<void> {
    if (!this.pool) {
      throw new Error("MySQL pool not initialized");
    }

    try {
      // Create a temporary connection without specifying database
      const tempConfig = { ...this.config };
      delete tempConfig.database;
      const tempPool = mysql.createPool(tempConfig);

      const connection = await tempPool.getConnection();

      // Create database if it doesn't exist
      await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${this.dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

      connection.release();
      await tempPool.end();

      console.log(`📊 Database '${this.dbName}' ensured`);
    } catch (error) {
      console.error("❌ Error ensuring database:", error);
      throw error;
    }
  }

  /**
   * Ensures the cache table exists with proper schema
   * @returns Promise<void>
   */
  private async ensureTable(): Promise<void> {
    if (!this.pool) {
      throw new Error("MySQL pool not initialized");
    }

    try {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS \`${this.tableName}\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`phone_number\` VARCHAR(20) NOT NULL,
          \`cache_data\` JSON NOT NULL,
          \`timestamp\` DATETIME NOT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY \`unique_phone\` (\`phone_number\`),
          KEY \`idx_phone_number\` (\`phone_number\`),
          KEY \`idx_timestamp\` (\`timestamp\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;

      await this.pool.execute(createTableSQL);

      console.log(`📋 Table '${this.tableName}' ensured with proper schema`);
    } catch (error) {
      console.error("❌ Error ensuring table:", error);
      throw error;
    }
  }

  /**
   * Closes the MySQL connection pool
   */
  private async closeConnection(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
        console.log("🔌 MySQL connection pool closed");
      }
    } catch (error) {
      console.error("❌ Error closing MySQL connection pool:", error);
    }
  }

  /**
   * Generates a cache key for a phone number
   * @param phoneNumber - The phone number to generate key for
   * @returns The cache key
   */
  generateKey(phoneNumber: string): string {
    return `${this.cacheKeyPrefix}-${phoneNumber}`;
  }

  /**
   * Checks if caching is enabled (MySQL configuration is available)
   * @returns True if caching is enabled, false otherwise
   */
  private isCacheEnabled(): boolean {
    return !!(this.config?.host && this.config?.user && this.config?.database);
  }

  /**
   * Retrieves a cached result from MySQL
   * @param phoneNumber - The phone number to check cache for
   * @returns Promise<CachedResult | null> - The cached result if found and valid, null otherwise
   */
  async get(phoneNumber: string): Promise<CachedResult | null> {
    try {
      if (!this.isCacheEnabled()) {
        console.log("🔄 MySQL configuration incomplete, skipping cache check");
        return null;
      }

      const connected = await this.ensureConnection();
      if (!connected || !this.pool) {
        console.log("🔄 MySQL connection failed, skipping cache check");
        return null;
      }

      console.log(`🔍 Checking MySQL cache for phone number: ${phoneNumber}`);

      // Find the cached record
      const [rows] = await this.pool.execute(`SELECT \`cache_data\`, \`timestamp\` FROM \`${this.tableName}\` WHERE \`phone_number\` = ? ORDER BY \`updated_at\` DESC LIMIT 1`, [phoneNumber]);

      const cachedRows = rows as any[];

      if (!cachedRows || cachedRows.length === 0) {
        console.log(`📭 No cached result found for phone number: ${phoneNumber}`);
        return null;
      }

      const cachedRow = cachedRows[0];

      // Parse the JSON data
      let cachedData: CachedResult;
      try {
        cachedData = {
          ...JSON.parse(cachedRow.cache_data),
          timestamp: cachedRow.timestamp,
          phoneNumber: phoneNumber,
        };
      } catch (parseError) {
        console.log(`⚠️ Invalid JSON cache data for phone number: ${phoneNumber}`, parseError);
        // Clean up invalid cache entry
        await this.pool.execute(`DELETE FROM \`${this.tableName}\` WHERE \`phone_number\` = ?`, [phoneNumber]);
        return null;
      }
      console.log(`📋 Found cached result for phone number: ${typeof cachedData} | ${JSON.stringify(cachedData)}`);
      // Validate the cached data structure
      if (!this.isValidCacheData(cachedData)) {
        console.log(`⚠️ Invalid cache data structure for phone number: ${phoneNumber}`);
        // Clean up invalid cache entry
        await this.pool.execute(`DELETE FROM \`${this.tableName}\` WHERE \`phone_number\` = ?`, [phoneNumber]);
        return null;
      }

      // Check if the cache is still valid
      if (this.isValid(cachedData, this.maxAgeHours)) {
        const ageHours = this.getAgeInHours(cachedData);
        console.log(`📋 Found valid cached result for phone number: ${phoneNumber} (${ageHours.toFixed(1)} hours old)`);
        return cachedData;
      } else {
        const ageHours = this.getAgeInHours(cachedData);
        console.log(`⏰ Cached result for phone number: ${phoneNumber} is too old (${ageHours.toFixed(1)} hours), will refresh`);
        // Clean up expired cache entry
        return null;
      }
    } catch (error) {
      console.log(`❌ Error checking MySQL cache for phone number ${phoneNumber}:`, error);
      return null;
    }
  }

  /**
   * Stores a result in the cache using MySQL
   * @param phoneNumber - The phone number
   * @param data - The result data to cache
   * @returns Promise<void>
   */
  async set(phoneNumber: string, data: UrsecResponse): Promise<void> {
    try {
      if (!this.isCacheEnabled()) {
        console.log("🔄 MySQL configuration incomplete, skipping cache storage");
        return;
      }

      // Only cache successful results (no errors)
      if (!this.shouldCache(data)) {
        console.log(`🚫 Not caching result for phone number: ${phoneNumber} (contains error or invalid data)`);
        return;
      }

      const connected = await this.ensureConnection();
      if (!connected || !this.pool) {
        console.log("🔄 MySQL connection failed, skipping cache storage");
        return;
      }

      const cacheData = {
        data: data,
        phoneNumber: phoneNumber,
      };

      const timestamp = new Date();

      console.log(`💾 Storing cache in MySQL for phone number: ${phoneNumber}`);

      // Use INSERT ... ON DUPLICATE KEY UPDATE to upsert
      const [result] = await this.pool.execute(
        `INSERT INTO \`${this.tableName}\` (\`phone_number\`, \`cache_data\`, \`timestamp\`) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         \`cache_data\` = VALUES(\`cache_data\`), 
         \`timestamp\` = VALUES(\`timestamp\`), 
         \`updated_at\` = CURRENT_TIMESTAMP`,
        [phoneNumber, JSON.stringify(cacheData), timestamp]
      );

      const insertResult = result as mysql.ResultSetHeader;

      if (insertResult.affectedRows > 0) {
        console.log(`✅ Successfully cached result for phone number: ${phoneNumber}`, {
          inserted: insertResult.insertId > 0,
          updated: insertResult.insertId === 0,
        });
      } else {
        console.warn(`⚠️ Cache operation affected 0 rows for phone number: ${phoneNumber}`);
      }
    } catch (error) {
      console.error(`❌ Error storing cache in MySQL for phone number ${phoneNumber}:`, error);
      // Don't throw error, caching failure shouldn't break the main functionality
    }
  }

  /**
   * Checks if a cached result is still valid (within the specified age limit)
   * @param cachedResult - The cached result to validate
   * @param maxAgeHours - Maximum age in hours (optional, uses default if not provided)
   * @returns True if the cache is still valid, false otherwise
   */
  isValid(cachedResult: CachedResult, maxAgeHours?: number): boolean {
    const maxAge = maxAgeHours || this.maxAgeHours;
    const ageHours = this.getAgeInHours(cachedResult);
    return ageHours < maxAge;
  }

  /**
   * Calculates the age of a cached result in hours
   * @param cachedResult - The cached result
   * @returns Age in hours
   */
  private getAgeInHours(cachedResult: CachedResult): number {
    const cacheTimestamp = new Date(cachedResult.timestamp);
    const now = new Date();
    return (now.getTime() - cacheTimestamp.getTime()) / (1000 * 60 * 60);
  }

  /**
   * Validates the structure of cached data
   * @param data - The data to validate
   * @returns True if the data structure is valid, false otherwise
   */
  private isValidCacheData(data: any): data is CachedResult {
    return data && typeof data === "object" && typeof data.phoneNumber === "string" && data.data && typeof data.data === "object";
  }

  /**
   * Determines if a result should be cached
   * @param data - The result data to evaluate
   * @returns True if the data should be cached, false otherwise
   */
  private shouldCache(data: UrsecResponse): boolean {
    // Don't cache if there's an error
    if (data.error) {
      return false;
    }

    // Don't cache if there's no response data
    if (!data.response) {
      return false;
    }

    // Cache if we have a valid response
    return true;
  }

  /**
   * Clears a specific cache entry
   * @param phoneNumber - The phone number to clear cache for
   * @returns Promise<boolean> - True if cleared successfully, false otherwise
   */
  async clear(phoneNumber: string): Promise<boolean> {
    try {
      if (!this.isCacheEnabled()) {
        console.log("🔄 MySQL configuration incomplete, cannot clear cache");
        return false;
      }

      const connected = await this.ensureConnection();
      if (!connected || !this.pool) {
        console.log("🔄 MySQL connection failed, cannot clear cache");
        return false;
      }

      console.log(`🗑️ Clearing cache for phone number: ${phoneNumber}`);

      const [result] = await this.pool.execute(`DELETE FROM \`${this.tableName}\` WHERE \`phone_number\` = ?`, [phoneNumber]);

      const deleteResult = result as mysql.ResultSetHeader;

      if (deleteResult.affectedRows > 0) {
        console.log(`✅ Cleared ${deleteResult.affectedRows} cache entries for phone number: ${phoneNumber}`);
        return true;
      } else {
        console.log(`📭 No cache entries found to clear for phone number: ${phoneNumber}`);
        return true; // Not an error, just nothing to clear
      }
    } catch (error) {
      console.error(`❌ Error clearing cache for phone number ${phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * Clears all expired cache entries manually (useful for maintenance)
   * @returns Promise<number> - Number of entries cleared
   */
  async clearExpired(): Promise<number> {
    try {
      if (!this.isCacheEnabled()) {
        console.log("🔄 MySQL configuration incomplete, cannot clear expired cache");
        return 0;
      }

      const connected = await this.ensureConnection();
      if (!connected || !this.pool) {
        console.log("🔄 MySQL connection failed, cannot clear expired cache");
        return 0;
      }

      console.log(`🧹 Clearing expired cache entries older than ${this.maxAgeHours} hours`);

      const [result] = await this.pool.execute(`DELETE FROM \`${this.tableName}\` WHERE \`timestamp\` < DATE_SUB(NOW(), INTERVAL ? HOUR)`, [this.maxAgeHours]);

      const deleteResult = result as mysql.ResultSetHeader;

      console.log(`✅ Cleared ${deleteResult.affectedRows} expired cache entries`);
      return deleteResult.affectedRows;
    } catch (error) {
      console.error(`❌ Error clearing expired cache entries:`, error);
      return 0;
    }
  }

  /**
   * Gets cache statistics
   * @returns Promise<object> - Cache statistics
   */
  async getStats(): Promise<{ enabled: boolean; tokenAvailable: boolean; maxAgeHours: number; totalEntries?: number; oldestEntry?: string; newestEntry?: string }> {
    const stats = {
      enabled: this.isCacheEnabled(),
      tokenAvailable: false,
      maxAgeHours: this.maxAgeHours,
      totalEntries: undefined as number | undefined,
      oldestEntry: undefined as string | undefined,
      newestEntry: undefined as string | undefined,
    };

    try {
      if (this.isCacheEnabled()) {
        const connected = await this.ensureConnection();
        stats.tokenAvailable = connected;

        if (connected && this.pool) {
          // Get total number of cached entries
          const [countRows] = await this.pool.execute(`SELECT COUNT(*) as total FROM \`${this.tableName}\``);
          const countResult = countRows as any[];
          stats.totalEntries = countResult[0]?.total || 0;

          // Get oldest and newest entries
          const [rangeRows] = await this.pool.execute(`SELECT MIN(\`timestamp\`) as oldest, MAX(\`timestamp\`) as newest FROM \`${this.tableName}\``);
          const rangeResult = rangeRows as any[];
          stats.oldestEntry = rangeResult[0]?.oldest || undefined;
          stats.newestEntry = rangeResult[0]?.newest || undefined;
        }
      }
    } catch (error) {
      console.error("❌ Error getting MySQL cache stats:", error);
    }

    return stats;
  }

  /**
   * Performs cleanup operations (close connections, etc.)
   * Should be called when the service is no longer needed
   */
  async cleanup(): Promise<void> {
    await this.closeConnection();
  }

  /**
   * Tests the database connection and table setup
   * @returns Promise<boolean> - True if everything is working correctly
   */
  async testConnection(): Promise<boolean> {
    try {
      const connected = await this.ensureConnection();
      if (!connected) {
        return false;
      }

      // Test a simple query
      if (this.pool) {
        const [rows] = await this.pool.execute(`SELECT 1 as test`);
        console.log("✅ MySQL connection test successful");
        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ MySQL connection test failed:", error);
      return false;
    }
  }
}
