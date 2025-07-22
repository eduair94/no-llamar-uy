#!/usr/bin/env ts-node

import { PhoneChecker } from "./src/PhoneChecker";
import { PhoneValidator } from "./src/PhoneValidator";

async function testPhoneChecker() {
  console.log("🧪 Testing PhoneChecker JSON Output");
  console.log("====================================");

  const phoneChecker = new PhoneChecker();
  const phoneValidator = new PhoneValidator();

  // Test phone numbers
  const testNumbers = ["98297150", "+59898297150", "099123456", "+59899123456"];

  for (const number of testNumbers) {
    console.log(`\n🔍 Testing phone number: ${number}`);
    console.log("-".repeat(50));

    try {
      // First validate the number
      const validation = phoneValidator.validateUruguayanPhone(number);
      console.log("📋 Validation Result:");
      console.log(JSON.stringify(validation, null, 2));

      if (validation.isValid) {
        console.log("\n🌐 Making portal request...");

        // Make the portal request
        const result = await phoneChecker.check(number);

        console.log("\n📄 Portal Response JSON:");
        console.log(JSON.stringify(result, null, 2));

        console.log("\n✅ JSON file saved successfully!");
      } else {
        console.log("\n❌ Phone number validation failed, skipping portal check");
      }
    } catch (error) {
      console.error(`\n❌ Error testing ${number}:`, error instanceof Error ? error.message : "Unknown error");

      // Even on error, show the error JSON structure
      const errorResult = {
        timestamp: new Date().toISOString(),
        phoneNumber: number,
        error: true,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        requestUrl: "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/apia.portal.PortalAction.run?dshId=1057",
      };

      console.log("\n📄 Error JSON Structure:");
      console.log(JSON.stringify(errorResult, null, 2));
    }

    console.log("\n" + "=".repeat(50));
  }

  console.log("\n🎯 Testing Latest Response Retrieval");
  console.log("====================================");

  // Test getting latest response
  for (const number of testNumbers.slice(0, 2)) {
    // Test first 2 numbers
    try {
      console.log(`\n📂 Getting latest response for: ${number}`);
      const latestResponse = await phoneChecker.getLatestResponse(number);

      if (latestResponse) {
        console.log("📄 Latest Response JSON:");
        console.log(JSON.stringify(latestResponse, null, 2));
      } else {
        console.log("❌ No previous response found");
      }
    } catch (error) {
      console.error(`❌ Error getting latest response for ${number}:`, error);
    }
  }

  console.log("\n🏁 Test completed!");
  console.log('Check the "responses/" directory for saved JSON files');
}

// Run the test
testPhoneChecker().catch(console.error);
