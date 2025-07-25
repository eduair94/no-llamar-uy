import { Collection, Db, MongoClient } from "mongodb";
import { CachedResult, ICacheService } from "../CacheService.interface";
import { UrsecResponse } from "../PhoneChecker";

/**
 * MongoDB cache service implementation
 * Follows Single Responsibility Principle - only handles caching operations using MongoDB
 */
export class MongoDBCacheService implements ICacheService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection<CachedResult> | null = null;
  private readonly defaultMaxAgeHours = 24;
  private readonly cacheKeyPrefix = "phone-cache";
  private readonly collectionName = "phone_cache";
  private readonly dbName = "no_llamar_cache";

  constructor(private readonly connectionString?: string, private readonly maxAgeHours: number = 24) {
    this.connectionString = connectionString || process.env.MONGODB_CONNECTION_STRING;
  }

  /**
   * Initializes the MongoDB connection if not already connected
   * @returns Promise<boolean> - True if connection successful, false otherwise
   */
  private async ensureConnection(): Promise<boolean> {
    try {
      if (!this.connectionString) {
        console.log("🔄 No MongoDB connection string found, skipping cache");
        return false;
      }

      if (this.client && this.db && this.collection) {
        // Check if connection is still alive
        await this.client.db("admin").command({ ping: 1 });
        return true;
      }

      console.log("🔌 Connecting to MongoDB...");
      this.client = new MongoClient(this.connectionString);
      await this.client.connect();

      this.db = this.client.db(this.dbName);
      this.collection = this.db.collection<CachedResult>(this.collectionName);

      // Create TTL index for automatic expiration (24 hours by default)
      await this.collection.createIndex({ timestamp: 1 }, { expireAfterSeconds: this.maxAgeHours * 3600, background: true });

      // Create index on phoneNumber for faster queries
      await this.collection.createIndex({ phoneNumber: 1 }, { background: true });

      console.log("✅ Connected to MongoDB successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to connect to MongoDB:", error);
      return false;
    }
  }

  /**
   * Closes the MongoDB connection
   */
  private async closeConnection(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        this.collection = null;
        console.log("🔌 MongoDB connection closed");
      }
    } catch (error) {
      console.error("❌ Error closing MongoDB connection:", error);
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
   * Checks if caching is enabled (MongoDB connection string is available)
   * @returns True if caching is enabled, false otherwise
   */
  private isCacheEnabled(): boolean {
    return !!this.connectionString;
  }

  /**
   * Retrieves a cached result from MongoDB
   * @param phoneNumber - The phone number to check cache for
   * @returns Promise<CachedResult | null> - The cached result if found and valid, null otherwise
   */
  async get(phoneNumber: string): Promise<CachedResult | null> {
    try {
      if (!this.isCacheEnabled()) {
        console.log("🔄 No MongoDB connection string found, skipping cache check");
        return null;
      }

      const connected = await this.ensureConnection();
      if (!connected || !this.collection) {
        console.log("🔄 MongoDB connection failed, skipping cache check");
        return null;
      }

      console.log(`🔍 Checking MongoDB cache for phone number: ${phoneNumber}`);

      // Find the cached document
      const cachedDoc: any = await this.collection.findOne(
        { phoneNumber },
        { sort: { timestamp: -1 } } // Get the most recent if multiple exist
      );

      if (!cachedDoc) {
        console.log(`📭 No cached result found for phone number: ${phoneNumber}`);
        return null;
      }

      // Validate the cached data structure
      if (!this.isValidCacheData(cachedDoc)) {
        console.log(`⚠️ Invalid cache data structure for phone number: ${phoneNumber}`);
        // Clean up invalid cache entry
        await this.collection.deleteOne({ _id: cachedDoc._id });
        return null;
      }

      // Check if the cache is still valid
      if (this.isValid(cachedDoc, this.maxAgeHours)) {
        const ageHours = this.getAgeInHours(cachedDoc);
        console.log(`📋 Found valid cached result for phone number: ${phoneNumber} (${ageHours.toFixed(1)} hours old)`);
        return cachedDoc;
      } else {
        const ageHours = this.getAgeInHours(cachedDoc);
        console.log(`⏰ Cached result for phone number: ${phoneNumber} is too old (${ageHours.toFixed(1)} hours), will refresh`);
        // Clean up expired cache entry (though TTL should handle this)
        await this.collection.deleteOne({ _id: cachedDoc._id });
        return null;
      }
    } catch (error) {
      // Check if the error is specifically about the document not being found
      if (error instanceof Error && error.message.includes("not found")) {
        console.log(`📭 No cached result found for phone number: ${phoneNumber}`);
        return null;
      }

      console.log(`❌ Error checking MongoDB cache for phone number ${phoneNumber}:`, error);
      return null;
    }
  }

  /**
   * Stores a result in the cache using MongoDB
   * @param phoneNumber - The phone number
   * @param data - The result data to cache
   * @returns Promise<void>
   */
  async set(phoneNumber: string, data: UrsecResponse): Promise<void> {
    try {
      if (!this.isCacheEnabled()) {
        console.log("🔄 No MongoDB connection string found, skipping cache storage");
        return;
      }

      // Only cache successful results (no errors)
      if (!this.shouldCache(data)) {
        console.log(`🚫 Not caching result for phone number: ${phoneNumber} (contains error or invalid data)`);
        return;
      }

      const connected = await this.ensureConnection();
      if (!connected || !this.collection) {
        console.log("🔄 MongoDB connection failed, skipping cache storage");
        return;
      }

      const cacheData: CachedResult = {
        timestamp: new Date().toISOString(),
        data: data,
        phoneNumber: phoneNumber,
      };

      console.log(`💾 Storing cache in MongoDB for phone number: ${phoneNumber}`);

      // Use upsert to replace any existing cache for this phone number
      const result = await this.collection.replaceOne({ phoneNumber }, cacheData, { upsert: true });

      if (result.acknowledged) {
        console.log(`✅ Successfully cached result for phone number: ${phoneNumber}`, {
          upserted: result.upsertedCount > 0,
          modified: result.modifiedCount > 0,
        });
      } else {
        console.warn(`⚠️ Cache operation not acknowledged for phone number: ${phoneNumber}`);
      }
    } catch (error) {
      console.error(`❌ Error storing cache in MongoDB for phone number ${phoneNumber}:`, error);
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
    return data && typeof data === "object" && typeof data.timestamp === "string" && typeof data.phoneNumber === "string" && data.data && typeof data.data === "object";
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
        console.log("🔄 No MongoDB connection string found, cannot clear cache");
        return false;
      }

      const connected = await this.ensureConnection();
      if (!connected || !this.collection) {
        console.log("🔄 MongoDB connection failed, cannot clear cache");
        return false;
      }

      console.log(`🗑️ Clearing cache for phone number: ${phoneNumber}`);

      const result = await this.collection.deleteMany({ phoneNumber });

      if (result.acknowledged && result.deletedCount > 0) {
        console.log(`✅ Cleared ${result.deletedCount} cache entries for phone number: ${phoneNumber}`);
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
        console.log("🔄 No MongoDB connection string found, cannot clear expired cache");
        return 0;
      }

      const connected = await this.ensureConnection();
      if (!connected || !this.collection) {
        console.log("🔄 MongoDB connection failed, cannot clear expired cache");
        return 0;
      }

      const expiredThreshold = new Date(Date.now() - this.maxAgeHours * 60 * 60 * 1000);

      console.log(`🧹 Clearing expired cache entries older than: ${expiredThreshold.toISOString()}`);

      const result = await this.collection.deleteMany({
        timestamp: { $lt: expiredThreshold.toISOString() },
      });

      if (result.acknowledged) {
        console.log(`✅ Cleared ${result.deletedCount} expired cache entries`);
        return result.deletedCount;
      } else {
        console.warn(`⚠️ Clear expired operation not acknowledged`);
        return 0;
      }
    } catch (error) {
      console.error(`❌ Error clearing expired cache entries:`, error);
      return 0;
    }
  }

  /**
   * Gets cache statistics
   * @returns Promise<object> - Cache statistics
   */
  async getStats(): Promise<{ enabled: boolean; tokenAvailable: boolean; maxAgeHours: number }> {
    const stats = {
      enabled: this.isCacheEnabled(),
      tokenAvailable: false,
      maxAgeHours: this.maxAgeHours,
    };

    try {
      if (this.isCacheEnabled()) {
        const connected = await this.ensureConnection();

        if (connected && this.collection) {
          // Get total number of cached entries
          // Get collection statistics
          stats.tokenAvailable = true;
        }
      }
    } catch (error) {
      console.error("❌ Error getting cache stats:", error);
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
}
