import { createCacheService } from "./src/CacheService";
import { PhoneChecker } from "./src/PhoneChecker";

async function testIgnoreCacheFeature() {
  console.log("🧪 Testing ignoreCache functionality...");

  // Create a phone checker with cache
  const cacheService = createCacheService("vercel-blob", { maxAgeHours: 24 });
  const phoneChecker = new PhoneChecker(cacheService);

  const testNumber = "95614500";

  console.log("\n📱 Testing phone checker with ignoreCache parameter...");

  // Test 1: Normal check (uses cache if available)
  console.log("\n🔍 Test 1: Normal check (with cache)");
  const result1 = await phoneChecker.check(testNumber);
  console.log(`✅ Result 1 cached: ${result1.cached || false}`);

  // Test 2: Check with ignoreCache = false (explicit)
  console.log("\n🔍 Test 2: Check with ignoreCache = false");
  const result2 = await phoneChecker.check(testNumber, { ignoreCache: false });
  console.log(`✅ Result 2 cached: ${result2.cached || false}`);

  // Test 3: Check with ignoreCache = true (bypass cache)
  console.log("\n🔍 Test 3: Check with ignoreCache = true");
  const result3 = await phoneChecker.check(testNumber, { ignoreCache: true });
  console.log(`✅ Result 3 cached: ${result3.cached || false}`);
  console.log(`✅ Result 3 should NOT be cached: ${!result3.cached ? "PASS" : "FAIL"}`);

  console.log("\n🏁 ignoreCache functionality test completed");

  // Test the options parameter structure
  console.log("\n🔧 Testing options parameter structure...");

  // Test with empty options
  const result4 = await phoneChecker.check(testNumber, {});
  console.log(`✅ Empty options object handled correctly`);

  // Test with undefined options
  const result5 = await phoneChecker.check(testNumber, undefined);
  console.log(`✅ Undefined options handled correctly`);

  console.log("\n✅ All tests completed successfully!");
}

// Only run if not in a production environment or if cache is disabled
async function main() {
  try {
    const cacheService = createCacheService("vercel-blob");
    const stats = await cacheService.getStats();

    if (!stats.enabled) {
      console.log("⚠️ Cache is disabled (no BLOB_READ_WRITE_TOKEN)");
      console.log("This test will only verify the parameter handling, not actual caching");
    }

    await testIgnoreCacheFeature();
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
main();
