import { UrsecResponse } from "./PhoneChecker";

export interface CachedResult {
  _id?: string;
  timestamp: string;
  data: UrsecResponse;
  phoneNumber: string;
}

export interface ICacheService {
  get(key: string): Promise<CachedResult | null>;
  set(key: string, data: UrsecResponse): Promise<void>;
  isValid(cachedResult: CachedResult, maxAgeHours?: number): boolean;
  generateKey(phoneNumber: string): string;
  getStats(): Promise<{ enabled: boolean; tokenAvailable: boolean; maxAgeHours: number }>;
}

// Export all cache service implementations
export { MongoDBCacheService } from "./CacheService/MongoDBCacheService";
export { MySQLCacheService } from "./CacheService/MySQLCacheService";
export { VercelBlobCacheService } from "./CacheService/VercelBlobCacheService";

// Export factory functions
export { CacheServiceOptions, CacheServiceType, createAutoCacheService, createCacheService } from "./CacheService";
