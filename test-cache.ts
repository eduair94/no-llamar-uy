import dotenv from "dotenv";
import { PhoneChecker } from "./src/PhoneChecker";

dotenv.config();

async function testCaching() {
  const checker = new PhoneChecker();
  const testNumber = "09912345";

  console.log("=== Testing Phone Number Caching ===");
  console.log(`Test number: ${testNumber}`);
  console.log(`BLOB_READ_WRITE_TOKEN available: ${!!process.env.BLOB_READ_WRITE_TOKEN}`);

  try {
    // First check - should perform actual validation
    console.log("\n--- First Check (should perform validation) ---");
    const start1 = Date.now();
    const result1 = await checker.check(testNumber);
    const duration1 = Date.now() - start1;

    console.log(`Result 1:`, result1);
    console.log(`Duration 1: ${duration1}ms`);
    console.log(`Cached: ${result1.cached || false}`);

    // Second check - should return cached result if caching is enabled
    console.log("\n--- Second Check (should use cache if available) ---");
    const start2 = Date.now();
    const result2 = await checker.check(testNumber);
    const duration2 = Date.now() - start2;

    console.log(`Result 2:`, result2);
    console.log(`Duration 2: ${duration2}ms`);
    console.log(`Cached: ${result2.cached || false}`);

    // Compare results
    if (result2.cached) {
      console.log("\n✅ Caching is working! Second request used cached data.");
      console.log(`Performance improvement: ${(((duration1 - duration2) / duration1) * 100).toFixed(1)}% faster`);
    } else {
      console.log("\n⚠️ No cache used - either caching is disabled or there was an issue.");
    }

    // Show cache timestamp if available
    if (result2.cacheTimestamp) {
      console.log(`Cache timestamp: ${result2.cacheTimestamp}`);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testCaching().catch(console.error);
