import { createCacheService } from "./src/CacheService";
import { UrsecResponse } from "./src/PhoneChecker";

async function testCacheService() {
  console.log("🧪 Testing Cache Service...");

  // Create cache service
  const cacheService = createCacheService("vercel-blob", {
    maxAgeHours: 24,
  });

  // Get cache stats
  const stats = await cacheService.getStats();
  console.log("📊 Cache stats:", stats);

  if (!stats.enabled) {
    console.log("⚠️ Cache is disabled (no BLOB_READ_WRITE_TOKEN), skipping tests");
    return;
  }

  const testPhoneNumber = "95614500";

  // Test 1: Check for non-existent cache
  console.log("\n🔍 Test 1: Checking for non-existent cache...");
  const cachedResult1 = await cacheService.get(testPhoneNumber);
  console.log("Result:", cachedResult1 ? "Found cache" : "No cache found (expected)");

  // Test 2: Store a test result
  console.log("\n💾 Test 2: Storing a test result...");
  const testData: UrsecResponse = {
    captchaSolveAttempts: 1,
    response: "Test response for cache",
    isInRecord: false,
  };

  await cacheService.set(testPhoneNumber, testData);
  console.log("✅ Test data stored");

  // Test 3: Retrieve the stored result
  console.log("\n📋 Test 3: Retrieving stored result...");
  const cachedResult2 = await cacheService.get(testPhoneNumber);

  if (cachedResult2) {
    console.log("✅ Cache retrieved successfully");
    console.log("📊 Cache data:", {
      phoneNumber: cachedResult2.phoneNumber,
      timestamp: cachedResult2.timestamp,
      response: cachedResult2.data.response,
      isValid: cacheService.isValid(cachedResult2),
    });
  } else {
    console.log("❌ Failed to retrieve cache");
  }

  console.log("\n🏁 Cache service test completed");
}

// Run the test
testCacheService().catch(console.error);
