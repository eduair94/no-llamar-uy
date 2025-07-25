import dotenv from "dotenv";
import { CacheServiceType, createCacheService } from "./src/CacheService";

dotenv.config();

/**
 * Test script for all cache service providers
 * Tests Vercel Blob, MongoDB, and MySQL cache services
 */
async function testCacheServices() {
  console.log("🧪 Testing Cache Service Implementations\n");

  const testPhoneNumber = "99123456";
  const testData = {
    captchaSolveAttempts: 1,
    response: "Test response - phone number not found in registry",
    isInRecord: false,
  };

  const providers: CacheServiceType[] = ["vercel-blob", "mongodb", "mysql"];

  for (const providerType of providers) {
    console.log(`\n📋 Testing ${providerType.toUpperCase()} Cache Service`);
    console.log("=".repeat(50));

    try {
      // Create cache service instance
      const cacheService = createCacheService(providerType, {
        maxAgeHours: 24,
      });

      // Get cache stats
      console.log("📊 Getting cache stats...");
      const stats = await cacheService.getStats();
      console.log("Stats:", JSON.stringify(stats, null, 2));

      if (!stats.enabled || !stats.tokenAvailable) {
        console.log("⚠️  Cache service not available (missing configuration)");
        continue;
      }

      // Clear any existing cache for test number
      console.log("\n🗑️  Clearing existing cache...");
      if (typeof (cacheService as any).clear === "function") {
        await (cacheService as any).clear(testPhoneNumber);
      }

      // Test cache miss
      console.log("\n🔍 Testing cache miss...");
      const missResult = await cacheService.get(testPhoneNumber);
      console.log("Cache miss result:", missResult === null ? "NULL (expected)" : "UNEXPECTED DATA");

      // Test cache set
      console.log("\n💾 Testing cache set...");
      await cacheService.set(testPhoneNumber, testData);
      console.log("Cache set: Complete");

      // Test cache hit
      console.log("\n🎯 Testing cache hit...");
      const hitResult = await cacheService.get(testPhoneNumber);
      if (hitResult) {
        console.log("Cache hit result:", {
          phoneNumber: hitResult.phoneNumber,
          hasData: !!hitResult.data,
          timestamp: hitResult.timestamp,
          isValid: cacheService.isValid(hitResult),
        });
      } else {
        console.log("Cache hit result: NULL (unexpected)");
      }

      // Test cache validation
      console.log("\n⏰ Testing cache validation...");
      if (hitResult) {
        const isValid = cacheService.isValid(hitResult, 24);
        console.log("Cache validation (24h):", isValid ? "VALID" : "EXPIRED");

        const isValidShort = cacheService.isValid(hitResult, 0.01); // 0.01 hours = 36 seconds
        console.log("Cache validation (0.01h):", isValidShort ? "VALID" : "EXPIRED (expected for old cache)");
      }

      // Test key generation
      console.log("\n🔑 Testing key generation...");
      const key = cacheService.generateKey(testPhoneNumber);
      console.log("Generated key:", key);

      // Test special methods if available
      if (typeof (cacheService as any).testConnection === "function") {
        console.log("\n🔌 Testing connection...");
        const connectionTest = await (cacheService as any).testConnection();
        console.log("Connection test:", connectionTest ? "PASSED" : "FAILED");
      }

      if (typeof (cacheService as any).clearExpired === "function") {
        console.log("\n🧹 Testing expired cleanup...");
        const clearedCount = await (cacheService as any).clearExpired();
        console.log("Expired entries cleared:", clearedCount);
      }

      // Cleanup
      if (typeof (cacheService as any).cleanup === "function") {
        console.log("\n🔧 Cleaning up connections...");
        await (cacheService as any).cleanup();
      }

      console.log(`✅ ${providerType.toUpperCase()} cache service test completed successfully`);
    } catch (error) {
      console.error(`❌ ${providerType.toUpperCase()} cache service test failed:`, error);
    }
  }

  console.log("\n🏁 All cache service tests completed\n");
}

// Auto-detection test
async function testAutoDetection() {
  console.log("🔍 Testing Auto-Detection Feature\n");

  try {
    const { createAutoCacheService } = await import("./src/CacheService");
    const autoCacheService = createAutoCacheService({ maxAgeHours: 24 });

    console.log("Auto-detected cache service created successfully");

    const stats = await autoCacheService.getStats();
    console.log("Auto-detected service stats:", JSON.stringify(stats, null, 2));

    if (typeof (autoCacheService as any).cleanup === "function") {
      await (autoCacheService as any).cleanup();
    }

    console.log("✅ Auto-detection test completed");
  } catch (error) {
    console.error("❌ Auto-detection test failed:", error);
  }
}

// Run tests
async function runAllTests() {
  console.log("🚀 Starting Cache Service Test Suite");
  console.log("=".repeat(60));

  await testCacheServices();
  await testAutoDetection();

  console.log("🎉 Test suite completed!");
  process.exit(0);
}

// Handle errors
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled rejection:", error);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
  process.exit(1);
});

// Run the tests
runAllTests().catch((error) => {
  console.error("❌ Test suite failed:", error);
  process.exit(1);
});
