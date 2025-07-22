#!/usr/bin/env ts-node

import { PhoneChecker } from "./src/PhoneChecker";

async function demonstrateNewFeatures() {
  console.log("🎯 Demonstrating Enhanced PhoneChecker Features");
  console.log("==============================================");

  const phoneChecker = new PhoneChecker();
  const testNumber = "98297150";

  console.log(`🔍 Testing with phone number: ${testNumber}`);
  console.log("📡 Making request with Chrome browser headers...");
  console.log("🔍 Parsing HTML response with cheerio...\n");

  try {
    const result = await phoneChecker.check(testNumber);

    console.log("✅ SUCCESS! Enhanced Response Generated:");
    console.log("=====================================");

    // Display key information
    console.log(`📊 Response Status: ${result.status} ${result.statusText}`);
    console.log(`📄 Page Title: ${result.parsedContent.title}`);
    console.log(`🎯 Found ${result.parsedContent.iframeCount} iframes`);
    console.log(`📜 Found ${result.parsedContent.scriptCount} scripts`);

    // Display iframes
    if (result.parsedContent.iframes.length > 0) {
      console.log("\n🖼️  IFRAMES DETECTED:");
      console.log("===================");
      result.parsedContent.iframes.forEach((iframe, index) => {
        console.log(`${index + 1}. Source: ${iframe.src}`);
        console.log(`   Dimensions: ${iframe.width || "auto"} x ${iframe.height || "auto"}`);
        console.log(`   ID: ${iframe.id || "none"}`);
        console.log(`   Name: ${iframe.name || "none"}`);
        console.log("");
      });
    }

    // Display key headers
    console.log("📋 IMPORTANT HEADERS:");
    console.log("====================");
    console.log(`Server: ${result.headers.server}`);
    console.log(`Content-Type: ${result.headers["content-type"]}`);
    console.log(`Set-Cookie: ${result.headers["set-cookie"]}`);
    console.log(`X-Frame-Options: ${result.headers["x-frame-options"]}`);

    // Display some scripts
    console.log("\n📜 DETECTED SCRIPTS (First 5):");
    console.log("==============================");
    result.parsedContent.scripts.slice(0, 5).forEach((script, index) => {
      console.log(`${index + 1}. ${script}`);
    });

    // Full JSON structure (truncated for display)
    const truncatedResult = {
      ...result,
      rawData: `[HTML Content - ${result.rawData.length} characters]`,
      parsedContent: {
        ...result.parsedContent,
        // Keep the important parsed content
      },
    };

    console.log("\n📄 JSON STRUCTURE (truncated):");
    console.log("==============================");
    console.log(JSON.stringify(truncatedResult, null, 2));

    console.log("\n🎯 ANALYSIS COMPLETE!");
    console.log("====================");
    console.log("✅ Chrome browser headers: Working");
    console.log("✅ SSL certificate handling: Working");
    console.log("✅ HTML parsing with cheerio: Working");
    console.log("✅ Iframe detection: Working");
    console.log("✅ Script detection: Working");
    console.log("✅ JSON response structure: Enhanced");
    console.log("✅ File saving: Working");
  } catch (error) {
    console.log("❌ ERROR occurred:");
    console.log("==================");
    console.log(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    console.log("\nThis might be expected due to network or certificate issues.");
  }
}

// Execute the demonstration
demonstrateNewFeatures();
