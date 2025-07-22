// Simple test server for local development
import express from "express";
import { PhoneChecker } from "./src/PhoneChecker";
import { PhoneValidator } from "./src/PhoneValidator";

const app = express();
const port = process.env.PORT || 3000;

// Initialize services
const phoneValidator = new PhoneValidator();
const phoneChecker = new PhoneChecker();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint (same as Vercel)
app.get("/api", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Uruguay Phone Validator API",
    availableEndpoints: ["GET /api - Health check", "GET /api/check/{phoneNumber} - Check phone number"],
  });
});

// Phone check endpoint (same as Vercel)
app.get("/api/check/:number", async (req, res) => {
  try {
    const { number } = req.params;

    if (!number) {
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

    console.log(`📋 Check completed with result: ${checkResult}`);

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
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Test server running at http://localhost:${port}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`  • GET  http://localhost:${port}/api`);
  console.log(`  • GET  http://localhost:${port}/api/check/{number}`);
  console.log(`\n🧪 Test examples:`);
  console.log(`  curl http://localhost:${port}/api`);
  console.log(`  curl http://localhost:${port}/api/check/98297150`);
  console.log(`  curl http://localhost:${port}/api/check/59898297150`);
});
