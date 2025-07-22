import { VercelRequest, VercelResponse } from "@vercel/node";
import { PhoneChecker } from "../../src/PhoneChecker";
import { PhoneValidator } from "../../src/PhoneValidator";

// Initialize services
const phoneValidator = new PhoneValidator();
const phoneChecker = new PhoneChecker();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { method } = req;
  const { number } = req.query;

  try {
    if (method !== "GET") {
      return res.status(405).json({
        success: false,
        error: "Method not allowed",
      });
    }

    if (!number || typeof number !== "string") {
      return res.status(400).json({
        success: false,
        error: "Phone number parameter is required",
      });
    }

    console.log(`\n🔍 Processing phone number: ${number}`);

    // Step 1: Validate the phone number format
    const validationResult = phoneValidator.validateUruguayanPhone(number);

    if (!validationResult.isValid) {
      console.log(`❌ Phone number validation failed: ${validationResult.error}`);
      return res.status(400).json({
        success: false,
        error: validationResult.error,
      });
    }

    // Step 2: Normalize to URSEC format
    const normalizedNumber = phoneValidator.normalizeUruguayanPhone(number);

    if (!normalizedNumber) {
      console.log(`❌ Phone number normalization failed`);
      return res.status(400).json({
        success: false,
        error: "Could not normalize phone number to URSEC format",
      });
    }

    console.log(`✅ Phone number validated and normalized: ${normalizedNumber}`);

    // Step 3: Check the phone number in URSEC
    console.log(`🌐 Checking phone number in URSEC: ${normalizedNumber}`);
    const checkResult = await phoneChecker.check(normalizedNumber);

    console.log(`📋 Check completed with result: ${checkResult.result}`);

    return res.json({
      success: true,
      phoneNumber: {
        original: number,
        normalized: normalizedNumber,
        isValid: true,
        formatted: validationResult.formatted,
        type: validationResult.type,
      },
      ursecCheck: checkResult,
    });
  } catch (error) {
    console.error("❌ API Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}
