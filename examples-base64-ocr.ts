/**
 * Example: Using OCR API with Base64 Images
 * This demonstrates how to send base64 encoded images to the OCR API
 */

import axios from "axios";
import { promises as fs } from "fs";
import * as path from "path";

const OCR_API_URL = "http://localhost:3001";

/**
 * Convert a local image file to base64
 */
async function imageToBase64(imagePath: string): Promise<string> {
  try {
    const imageBuffer = await fs.readFile(imagePath);
    const base64String = imageBuffer.toString("base64");

    // Detect image type from file extension
    const ext = path.extname(imagePath).toLowerCase();
    let mimeType = "image/png";

    switch (ext) {
      case ".jpg":
      case ".jpeg":
        mimeType = "image/jpeg";
        break;
      case ".png":
        mimeType = "image/png";
        break;
      case ".gif":
        mimeType = "image/gif";
        break;
      case ".webp":
        mimeType = "image/webp";
        break;
    }

    return `data:${mimeType};base64,${base64String}`;
  } catch (error) {
    throw new Error(`Failed to convert image to base64: ${error}`);
  }
}

/**
 * Example: Process a local image file with OCR using base64
 */
async function processLocalImageWithOCR(imagePath: string) {
  try {
    console.log(`📁 Converting local image to base64: ${imagePath}`);

    // Convert image to base64
    const base64Image = await imageToBase64(imagePath);
    console.log(`✅ Converted to base64 (${base64Image.length} characters)`);

    // Send to OCR API
    console.log("🔍 Processing with OCR API...");
    const response = await axios.post(`${OCR_API_URL}/ocr`, {
      imageUrl: base64Image,
      options: {
        useAdvanced: true,
        captchaMode: true,
      },
    });

    console.log("✅ OCR Result:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

/**
 * Example: Process CAPTCHA using base64
 */
async function processCaptchaWithBase64() {
  try {
    // Example base64 image (1x1 pixel PNG)
    const testBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

    console.log("🎯 Processing CAPTCHA with base64...");

    const response = await axios.post(`${OCR_API_URL}/ocr/captcha`, {
      imageUrl: testBase64,
      useAdvanced: true,
      charWhitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    });

    console.log("✅ CAPTCHA Result:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ CAPTCHA Error:", error);
    throw error;
  }
}

/**
 * Example: Batch processing with mixed URLs and base64
 */
async function batchProcessMixedImages() {
  try {
    const testBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const testUrl = "https://via.placeholder.com/200x50/000000/FFFFFF?text=TEST";

    console.log("📦 Batch processing mixed images...");

    const response = await axios.post(`${OCR_API_URL}/ocr/batch`, {
      imageUrls: [testUrl, testBase64],
      options: {
        captchaMode: true,
        useAdvanced: false,
      },
    });

    console.log("✅ Batch Result:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Batch Error:", error);
    throw error;
  }
}

/**
 * Run all examples
 */
async function runExamples() {
  console.log("🚀 Running Base64 OCR Examples...\n");

  try {
    // Test 1: Basic CAPTCHA with base64
    await processCaptchaWithBase64();

    console.log("\n" + "=".repeat(50) + "\n");

    // Test 2: Batch processing
    await batchProcessMixedImages();

    console.log("\n" + "=".repeat(50) + "\n");

    // Test 3: Local file (if you have an image file)
    // Uncomment and update path if you want to test with a local file
    // await processLocalImageWithOCR('./path/to/your/image.png');

    console.log("🎉 All examples completed successfully!");
  } catch (error) {
    console.error("❌ Example failed:", error);
  }
}

// Export functions for use in other modules
export { batchProcessMixedImages, imageToBase64, processCaptchaWithBase64, processLocalImageWithOCR };

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples();
}
