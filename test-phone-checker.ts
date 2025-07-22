#!/usr/bin/env ts-node

import { PhoneChecker } from "./src/PhoneChecker";

async function testPhoneChecker() {
  console.log("🧪 Testing PhoneChecker JSON Output");
  console.log("====================================");

  const phoneChecker = new PhoneChecker();

  const phoneNumber = "098297150";
  const checkResult = await phoneChecker.check(phoneNumber);
  console.log("\n🏁 Test completed!", checkResult);
}

// Run the test
testPhoneChecker().catch(console.error);
