// Simple Node.js test script for the API
import axios from "axios";

const BASE_URL = process.argv[2] || "http://localhost:3000";

console.log(`🧪 Testing API at: ${BASE_URL}\n`);

interface TestResult {
  name: string;
  passed: boolean;
  response?: any;
  error?: string;
}

const tests: TestResult[] = [];

async function runTest(name: string, url: string, expectedStatus: number = 200): Promise<TestResult> {
  try {
    console.log(`Testing: ${name}`);
    console.log(`GET ${url}`);

    const response = await axios.get(url, {
      timeout: 65000, // 65 second timeout for CAPTCHA processing
      validateStatus: () => true, // Don't throw on non-2xx status
    });

    const passed = response.status === expectedStatus;
    const result: TestResult = {
      name,
      passed,
      response: {
        status: response.status,
        data: response.data,
      },
    };

    if (passed) {
      console.log(`✅ PASSED - Status: ${response.status}`);
    } else {
      console.log(`❌ FAILED - Expected: ${expectedStatus}, Got: ${response.status}`);
    }

    console.log(`Response:`, JSON.stringify(response.data, null, 2));
    console.log("---\n");

    return result;
  } catch (error) {
    const result: TestResult = {
      name,
      passed: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };

    console.log(`❌ FAILED - Error: ${result.error}`);
    console.log("---\n");

    return result;
  }
}

async function runAllTests() {
  console.log("🚀 Starting comprehensive API tests...\n");

  // Test 1: Health check
  tests.push(await runTest("Health Check", `${BASE_URL}/api`, 200));

  // Test 2: Valid 8-digit phone number
  tests.push(await runTest("Valid 8-digit phone number", `${BASE_URL}/api/check/98297150`, 200));

  // Test 3: Valid phone with country code
  tests.push(await runTest("Valid phone with country code", `${BASE_URL}/api/check/59898297150`, 200));

  // Test 4: Invalid phone number
  tests.push(await runTest("Invalid phone number", `${BASE_URL}/api/check/123`, 400));

  // Test 5: Another valid mobile number
  tests.push(await runTest("Another valid mobile number", `${BASE_URL}/api/check/99123456`, 200));

  // Summary
  const passed = tests.filter((t) => t.passed).length;
  const total = tests.length;

  console.log(`\n🏁 Test Results: ${passed}/${total} passed\n`);

  if (passed === total) {
    console.log("🎉 All tests passed! Your API is working correctly.");
  } else {
    console.log("⚠️  Some tests failed. Check the output above for details.");

    const failed = tests.filter((t) => !t.passed);
    console.log("\nFailed tests:");
    failed.forEach((test) => {
      console.log(`  - ${test.name}: ${test.error || "Unexpected status code"}`);
    });
  }

  if (!process.argv[2]) {
    console.log("\n💡 To test your Vercel deployment:");
    console.log("   npm run test:api:node https://your-project.vercel.app");
  }
}

// Run the tests
runAllTests().catch(console.error);
