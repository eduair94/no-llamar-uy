/**
 * Test Script for OCR API Server
 * Run this to test the separate OCR API service
 */

import axios from "axios";

const OCR_API_URL = "http://localhost:3001"; // Default port for OCR API

async function testOCRAPI() {
  console.log("🧪 Testing OCR API Server...");

  try {
    // Test basic health check
    console.log("\n1. Testing health endpoint...");
    const healthResponse = await axios.get(`${OCR_API_URL}/health`);
    console.log("✅ Health check:", healthResponse.data);

    // Test OCR with a sample image URL
    console.log("\n2. Testing OCR endpoint...");
    const testImageUrl = "https://via.placeholder.com/200x50/000000/FFFFFF?text=TEST123";

    const ocrResponse = await axios.post(`${OCR_API_URL}/ocr`, {
      imageUrl: testImageUrl,
    });
    console.log("✅ OCR result:", ocrResponse.data);

    // Test CAPTCHA endpoint
    console.log("\n3. Testing CAPTCHA endpoint...");
    const captchaResponse = await axios.post(`${OCR_API_URL}/ocr/captcha`, {
      imageUrl: testImageUrl,
    });
    console.log("✅ CAPTCHA result:", captchaResponse.data);

    console.log("\n🎉 All tests passed!");
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("❌ API Error:", error.response?.data || error.message);
    } else {
      console.error("❌ Test Error:", error);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testOCRAPI();
}

export { testOCRAPI };
