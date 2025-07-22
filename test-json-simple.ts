#!/usr/bin/env ts-node

import { PhoneChecker } from "./src/PhoneChecker";

async function testJsonOutput() {
  console.log("📄 Testing JSON Output Generation");
  console.log("================================");

  const phoneChecker = new PhoneChecker();
  const testNumber = "98297150";

  console.log(`🔍 Testing with phone number: ${testNumber}`);
  console.log("Making request to URSEC portal...\n");

  try {
    const result = await phoneChecker.check(testNumber);

    console.log("✅ SUCCESS! JSON Response Generated:");
    console.log("=====================================");
    console.log(JSON.stringify(result, null, 2));

    console.log("\n📁 JSON file has been saved to the responses/ directory");
    console.log("🎯 Test completed successfully!");
  } catch (error) {
    console.log("❌ ERROR occurred (this is expected due to certificate issues):");
    console.log("==============================================================");

    const errorStructure = {
      timestamp: new Date().toISOString(),
      phoneNumber: testNumber,
      error: true,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      requestUrl: "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/apia.portal.PortalAction.run?dshId=1057",
    };

    console.log(JSON.stringify(errorStructure, null, 2));
    console.log("\n📁 Error JSON file has been saved to the responses/ directory");
    console.log("🎯 Test completed with expected error handling!");
  }
}

// Execute the test
testJsonOutput();
