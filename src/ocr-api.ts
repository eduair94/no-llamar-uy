import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import { OCRResult, OCRService } from "./OCRService";
dotenv.config();

const app = express();
const port = process.env.OCR_PORT || 3001;

// Initialize OCR service
const ocrService = new OCRService();

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "OCR API",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// OCR endpoint - process image URL
app.post("/ocr", async (req, res) => {
  try {
    const { imageUrl, options = {} } = req.body;

    // Validate input
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: "imageUrl is required",
        timestamp: new Date().toISOString(),
      });
    }

    if (typeof imageUrl !== "string") {
      return res.status(400).json({
        success: false,
        error: "imageUrl must be a string",
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`📥 OCR request received for: ${imageUrl}`);
    console.log(`⚙️ Options:`, options);

    // Process the image
    const result: OCRResult = await ocrService.processImageUrl(imageUrl, options);

    // Return result
    if (result.success) {
      console.log(`✅ OCR completed successfully: "${result.cleanedText}"`);
      return res.json(result);
    } else {
      console.log(`❌ OCR failed: ${result.error}`);
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error("❌ Unexpected error in OCR endpoint:", error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

// CAPTCHA-specific endpoint with optimized settings
app.post("/ocr/captcha", async (req, res) => {
  try {
    const { imageUrl, charWhitelist, useAdvanced = false, cookies } = req.body;

    // Validate input
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: "imageUrl is required",
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`🎯 CAPTCHA OCR request received for: ${imageUrl}`);

    // Process with CAPTCHA-optimized settings
    const result: OCRResult = await ocrService.processImageUrl(imageUrl, {
      captchaMode: true,
      cookies,
      useAdvanced: useAdvanced,
      charWhitelist: charWhitelist || "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    });

    // Return result
    if (result.success) {
      console.log(`🎯 CAPTCHA OCR completed: "${result.cleanedText}"`);
      return res.json(result);
    } else {
      console.log(`❌ CAPTCHA OCR failed: ${result.error}`);
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error("❌ Unexpected error in CAPTCHA OCR endpoint:", error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Batch OCR endpoint for multiple images
app.post("/ocr/batch", async (req, res) => {
  try {
    const { imageUrls, options = {} } = req.body;

    // Validate input
    if (!Array.isArray(imageUrls)) {
      return res.status(400).json({
        success: false,
        error: "imageUrls must be an array",
        timestamp: new Date().toISOString(),
      });
    }

    if (imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: "imageUrls array cannot be empty",
        timestamp: new Date().toISOString(),
      });
    }

    if (imageUrls.length > 10) {
      return res.status(400).json({
        success: false,
        error: "Maximum 10 images allowed per batch request",
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`📥 Batch OCR request received for ${imageUrls.length} images`);

    // Process all images
    const results = await Promise.allSettled(imageUrls.map((imageUrl) => ocrService.processImageUrl(imageUrl, options)));

    const processedResults = results.map((result, index) => ({
      index,
      imageUrl: imageUrls[index],
      ...(result.status === "fulfilled"
        ? result.value
        : {
            success: false,
            error: result.reason?.message || "Processing failed",
            timestamp: new Date().toISOString(),
          }),
    }));

    const successCount = processedResults.filter((r) => r.success).length;

    console.log(`✅ Batch OCR completed: ${successCount}/${imageUrls.length} successful`);

    return res.json({
      success: true,
      totalImages: imageUrls.length,
      successfulImages: successCount,
      results: processedResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Unexpected error in batch OCR endpoint:", error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

// API documentation endpoint
app.get("/", (req, res) => {
  res.json({
    service: "OCR API",
    version: "1.0.0",
    description: "Optical Character Recognition API using Tesseract.js",
    endpoints: {
      "GET /health": "Health check",
      "POST /ocr": "Process single image URL with OCR",
      "POST /ocr/captcha": "Process CAPTCHA image with optimized settings",
      "POST /ocr/batch": "Process multiple image URLs (max 10)",
      "GET /": "API documentation",
    },
    examples: {
      basicOCR: {
        url: "POST /ocr",
        body: {
          imageUrl: "https://example.com/image.png",
          options: {
            charWhitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
            useAdvanced: false,
            captchaMode: false,
          },
        },
      },
      captchaOCR: {
        url: "POST /ocr/captcha",
        body: {
          imageUrl: "https://example.com/captcha.png",
          useAdvanced: true,
          charWhitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        },
      },
      batchOCR: {
        url: "POST /ocr/batch",
        body: {
          imageUrls: ["https://example.com/image1.png", "https://example.com/image2.png"],
          options: {
            captchaMode: true,
            useAdvanced: false,
          },
        },
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("❌ Unhandled error:", err);

  res.status(500).json({
    success: false,
    error: "Internal server error",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    timestamp: new Date().toISOString(),
    availableEndpoints: ["/health", "/ocr", "/ocr/captcha", "/ocr/batch", "/"],
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 OCR API Server started!`);
  console.log(`📡 Server is running on: http://localhost:${port}`);
  console.log(`🔍 Available endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /ocr - Process single image with OCR`);
  console.log(`   POST /ocr/captcha - Process CAPTCHA with optimized settings`);
  console.log(`   POST /ocr/batch - Process multiple images (max 10)`);
  console.log(`   GET  / - API documentation`);
  console.log(``);
  console.log(`📝 CAPTCHA OCR Example:`);
  console.log(`   curl -X POST http://localhost:${port}/ocr/captcha \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"imageUrl":"https://example.com/captcha.png","useAdvanced":true}'`);
  console.log(``);
  console.log(`🌐 Ready to process images!`);
});

export default app;
