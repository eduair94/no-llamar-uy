import { head, put } from "@vercel/blob";
import dotenv from "dotenv";
import { CachedResult, ICacheService } from "../CacheService.interface";
import { UrsecResponse } from "../PhoneChecker";
dotenv.config();

/**
 * Cache service implementation using Vercel Blob storage
 * Follows Single Responsibility Principle - only handles caching operations
 */
export class VercelBlobCacheService implements ICacheService {
  private readonly defaultMaxAgeHours = 24;
  private readonly cacheKeyPrefix = "phone-cache";

  constructor(private readonly blobToken?: string, private readonly maxAgeHours: number = 24) {
    this.blobToken = blobToken || process.env.BLOB_READ_WRITE_TOKEN;
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
   * Checks if caching is enabled (blob token is available)
   * @returns True if caching is enabled, false otherwise
   */
  private isCacheEnabled(): boolean {
    return !!this.blobToken;
  }

  /**
   * Retrieves a cached result from Vercel Blob storage
   * @param phoneNumber - The phone number to check cache for
   * @returns Promise<CachedResult | null> - The cached result if found and valid, null otherwise
   */
  async get(phoneNumber: string): Promise<CachedResult | null> {
    try {
      if (!this.isCacheEnabled()) {
        console.log("🔄 No blob token found, skipping cache check");
        return null;
      }

      const cacheKey = this.generateKey(phoneNumber);
      console.log(`🔍 Checking cache for phone number: ${phoneNumber} (key: ${cacheKey})`);

      // Try to get the cached data from Vercel Blob using just the key
      const response = await head(cacheKey);

      if (!response.url) {
        console.log(`📭 No cached result found for phone number: ${phoneNumber}`);
        return null;
      }

      // Fetch the cached data
      const cacheResponse = await fetch(response.url);
      const cachedData = (await cacheResponse.json()) as CachedResult;

      // Validate the cached data structure
      if (!this.isValidCacheData(cachedData)) {
        console.log(`⚠️ Invalid cache data structure for phone number: ${phoneNumber}`);
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
        return null;
      }
    } catch (error) {
      // Check if the error is specifically about the blob not being found
      if (error instanceof Error && error.message.includes("not found")) {
        console.log(`📭 No cached result found for phone number: ${phoneNumber}`);
        return null;
      }

      console.log(`❌ Error checking cache for phone number ${phoneNumber}:`, error);
      return null;
    }
  }

  /**
   * Stores a result in the cache using Vercel Blob
   * @param phoneNumber - The phone number
   * @param data - The result data to cache
   * @returns Promise<void>
   */
  async set(phoneNumber: string, data: UrsecResponse): Promise<void> {
    try {
      if (!this.isCacheEnabled()) {
        console.log("🔄 No blob token found, skipping cache storage");
        return;
      }

      // Only cache successful results (no errors)
      if (!this.shouldCache(data)) {
        console.log(`🚫 Not caching result for phone number: ${phoneNumber} (contains error or invalid data)`);
        return;
      }

      const cacheKey = this.generateKey(phoneNumber);
      const cacheData: CachedResult = {
        timestamp: new Date().toISOString(),
        data: data,
        phoneNumber: phoneNumber,
      };

      console.log(`💾 Storing cache for phone number: ${phoneNumber} (key: ${cacheKey})`);

      // Store in Vercel Blob with proper options
      const result = await put(cacheKey, JSON.stringify(cacheData), {
        access: "public",
        contentType: "application/json",
      });

      console.log(`✅ Successfully cached result for phone number: ${phoneNumber}`, {
        url: result.url,
      });
    } catch (error) {
      console.error(`❌ Error storing cache for phone number ${phoneNumber}:`, error);
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
        console.log("🔄 No blob token found, cannot clear cache");
        return false;
      }

      const cacheKey = this.generateKey(phoneNumber);

      // Note: Vercel Blob doesn't have a direct delete API in the current version
      // This would need to be implemented when the delete functionality becomes available
      // For now, we'll just log the intent
      console.log(`🗑️ Cache clear requested for phone number: ${phoneNumber} (key: ${cacheKey})`);
      console.log("ℹ️ Note: Vercel Blob delete functionality not implemented in current version");

      return true;
    } catch (error) {
      console.error(`❌ Error clearing cache for phone number ${phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * Gets cache statistics (if supported by the storage backend)
   * @returns Promise<object> - Cache statistics
   */
  async getStats(): Promise<{ enabled: boolean; tokenAvailable: boolean; maxAgeHours: number }> {
    return {
      enabled: this.isCacheEnabled(),
      tokenAvailable: !!this.blobToken,
      maxAgeHours: this.maxAgeHours,
    };
  }
}

/**
 * Factory function to create a cache service instance
 * Follows Dependency Inversion Principle - allows for easy swapping of implementations
 */
export function createCacheService(
  type: "vercel-blob" = "vercel-blob",
  options?: {
    blobToken?: string;
    maxAgeHours?: number;
  }
): ICacheService {
  switch (type) {
    case "vercel-blob":
      return new VercelBlobCacheService(options?.blobToken, options?.maxAgeHours);
    default:
      throw new Error(`Unknown cache service type: ${type}`);
  }
}
