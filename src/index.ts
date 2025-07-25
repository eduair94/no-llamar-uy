import express, { Request, Response } from "express";
import { PhoneChecker } from "./PhoneChecker";
import { PhoneValidator } from "./PhoneValidator";

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

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Uruguay Phone Validator API",
  });
});

// Main endpoint to validate and check phone number
app.get("/check/:number", async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();

    const { number } = req.params;
    const { ignoreCache } = req.query;

    const shouldIgnoreCache = ignoreCache === "true" || ignoreCache === "1";
    if (shouldIgnoreCache) {
      console.log(`🚫 Cache bypass parameter detected, will perform fresh check`);
    }

    console.log(`\n🔍 Processing phone number: ${number}`);

    // Step 1: Validate the phone number format
    const validationResult = phoneValidator.validateUruguayanPhone(number);

    if (!validationResult.isValid) {
      console.log(`❌ Phone number validation failed: ${validationResult.error}`);
      res.status(400).json({
        success: false,
        error: validationResult.error,
        phoneNumber: number,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.log(`✅ Phone number validation passed: ${validationResult.formatted}`);

    // Step 2: Normalize the phone number
    const normalizedNumber = phoneValidator.normalizeUruguayanPhone(number);

    if (!normalizedNumber) {
      res.status(400).json({
        success: false,
        error: "Unable to normalize phone number",
        phoneNumber: number,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Step 3: Perform the check against URSEC portal
    let portalResponse;
    try {
      portalResponse = await phoneChecker.check(normalizedNumber, { ignoreCache: shouldIgnoreCache });
    } catch (error) {
      console.log(`❌ Portal check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      res.status(500).json({
        success: false,
        error: "Portal check failed",
        details: error instanceof Error ? error.message : "Unknown error",
        phoneNumber: normalizedNumber,
        validation: validationResult,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Calculate total execution time
    const timeMs = Date.now() - startTime;

    res.json({
      success: true,
      phoneNumber: {
        original: number,
        normalized: normalizedNumber,
        isValid: true,
        formatted: validationResult.formatted,
        type: validationResult.type,
      },
      ursecCheck: portalResponse,
      timeMs,
    });
  } catch (error) {
    console.error(`❌ Unexpected error:`, error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Legacy endpoint (kept for backward compatibility)
app.get("/number/:number", async (req: Request, res: Response): Promise<void> => {
  try {
    const { number } = req.params;

    console.log(`\n🔍 Processing phone number: ${number}`);

    // Step 1: Validate the phone number format
    const validationResult = phoneValidator.validateUruguayanPhone(number);

    if (!validationResult.isValid) {
      console.log(`❌ Phone number validation failed: ${validationResult.error}`);
      res.status(400).json({
        success: false,
        error: "Invalid phone number",
        details: validationResult.error,
        phoneNumber: number,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.log(`✅ Phone number validation passed: ${validationResult.formatted}`);

    // Step 2: Normalize the phone number
    const normalizedNumber = phoneValidator.normalizeUruguayanPhone(number);

    // Step 3: Perform the check against URSEC portal
    let portalResponse;
    try {
      portalResponse = await phoneChecker.check(normalizedNumber || number);
    } catch (error) {
      console.log(`❌ Portal check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      res.status(500).json({
        success: false,
        error: "Portal check failed",
        details: error instanceof Error ? error.message : "Unknown error",
        validation: validationResult,
        phoneNumber: number,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Step 4: Return successful response
    console.log(`✅ Successfully processed phone number: ${number}`);

    res.json({
      success: true,
      phoneNumber: number,
      validation: validationResult,
      normalizedNumber: normalizedNumber,
      portalResponse: portalResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ Unexpected error processing ${req.params.number}:`, error);

    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      phoneNumber: req.params.number,
      timestamp: new Date().toISOString(),
    });
  }
});

// Endpoint to get the latest response for a phone number
app.get("/number/:number/latest", async (req: Request, res: Response): Promise<void> => {
  try {
    const { number } = req.params;

    console.log(`📄 Getting latest response for phone number: ${number}`);

    const latestResponse = await phoneChecker.getLatestResponse(number);

    if (!latestResponse) {
      res.status(404).json({
        success: false,
        error: "No previous response found",
        phoneNumber: number,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      success: true,
      phoneNumber: number,
      latestResponse: latestResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ Error getting latest response for ${req.params.number}:`, error);

    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      phoneNumber: req.params.number,
      timestamp: new Date().toISOString(),
    });
  }
});

// Endpoint to validate phone number without checking portal
app.get("/validate/:number", (req: Request, res: Response) => {
  try {
    const { number } = req.params;

    console.log(`🔍 Validating phone number: ${number}`);

    const validationResult = phoneValidator.validateUruguayanPhone(number);
    const normalizedNumber = phoneValidator.normalizeUruguayanPhone(number);

    res.json({
      success: true,
      phoneNumber: number,
      validation: validationResult,
      normalizedNumber: normalizedNumber,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ Error validating ${req.params.number}:`, error);

    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      phoneNumber: req.params.number,
      timestamp: new Date().toISOString(),
    });
  }
});

// 404 handler
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    availableEndpoints: ["GET /health", "GET /number/:number", "GET /number/:number/latest", "GET /validate/:number"],
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((error: Error, req: Request, res: Response, next: any) => {
  console.error("❌ Unhandled error:", error);

  res.status(500).json({
    success: false,
    error: "Internal server error",
    details: error.message,
    timestamp: new Date().toISOString(),
  });
});

// Start server (only when not running on Vercel)
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`\n🚀 Uruguay Phone Validator API Server started!`);
    console.log(`📡 Server is running on: http://localhost:${port}`);
    console.log(`🔍 Available endpoints:`);
    console.log(`   GET /health - Health check`);
    console.log(`   GET /check/:number - Validate and check phone number`);
    console.log(`   GET /validate/:number - Validate phone number only`);
    console.log(`\n📝 Examples:`);
    console.log(`   http://localhost:${port}/check/95614500`);
    console.log(`   http://localhost:${port}/validate/+59895614500`);
    console.log(`\n🌐 Ready to receive requests!`);
  });
}

export default app;
