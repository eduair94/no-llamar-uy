import dotenv from "dotenv";
import { ICacheService } from "../CacheService.interface";
import { MongoDBCacheService } from "./MongoDBCacheService";
import { MySQLCacheService, MySQLConfig } from "./MySQLCacheService";
import { VercelBlobCacheService } from "./VercelBlobCacheService";
dotenv.config();
export type CacheServiceType = "vercel-blob" | "mongodb" | "mysql";

export interface CacheServiceOptions {
  maxAgeHours?: number;
  // Vercel Blob options
  blobToken?: string;
  // MongoDB options
  mongoUrl?: string;
  // MySQL options
  mysqlConfig?: MySQLConfig;
}

/**
 * Factory function to create a cache service instance
 * Follows Dependency Inversion Principle - allows for easy swapping of implementations
 */
export function createCacheService(type: CacheServiceType = "vercel-blob", options?: CacheServiceOptions): ICacheService {
  switch (type) {
    case "vercel-blob":
      return new VercelBlobCacheService(options?.blobToken, options?.maxAgeHours);

    case "mongodb":
      return new MongoDBCacheService(options?.mongoUrl, options?.maxAgeHours);

    case "mysql":
      return new MySQLCacheService(options?.mysqlConfig, options?.maxAgeHours);

    default:
      throw new Error(`Unknown cache service type: ${type}. Supported types: vercel-blob, mongodb, mysql`);
  }
}

/**
 * Auto-detects the best available cache service based on environment variables
 * Priority: MySQL > MongoDB > Vercel Blob
 */
export function createAutoCacheService(options?: CacheServiceOptions): ICacheService {
  // Try MySQL first
  if (process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE) {
    console.log("🔄 Auto-detected MySQL configuration, using MySQL cache service");
    return createCacheService("mysql", options);
  }

  // Try MongoDB second
  if (process.env.MONGODB_URL || process.env.MONGO_URL) {
    console.log("🔄 Auto-detected MongoDB configuration, using MongoDB cache service");
    return createCacheService("mongodb", options);
  }

  // Fall back to Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    console.log("🔄 Auto-detected Vercel Blob configuration, using Vercel Blob cache service");
    return createCacheService("vercel-blob", options);
  }

  // Default to Vercel Blob even without token (will just skip caching)
  console.log("🔄 No cache configuration detected, using Vercel Blob cache service (cache disabled)");
  return createCacheService("vercel-blob", options);
}
