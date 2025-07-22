import axios from "axios";
import cors from "cors";
import express from "express";
import { promises as fs } from "fs";
import https from "https";
import path from "path";
import { createWorker, OEM, PSM } from "tesseract.js";

const app = express();
const PORT = process.env.OCR_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create temp directory for images
const tempDir = process.env.VERCEL ? "/tmp" : path.join(__dirname, "..", "temp");

/**
 * Ensures the temp directory exists
 */
async function ensureTempDirectory(): Promise<void> {
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (error) {
    console.error("Error creating temp directory:", error);
  }
}

/**
 * Cleans and normalizes OCR text recognition results
 * @param rawText - Raw text from OCR recognition
 * @returns Cleaned text suitable for CAPTCHA submission
 */
function cleanOcrText(rawText: string): string {
  if (!rawText) return "";

  // Remove all non-alphanumeric characters
  let cleaned = rawText.replace(/[^a-zA-Z0-9]/g, "");

  // Common OCR misrecognitions
  const corrections: { [key: string]: string } = {
    "0": "O", // Zero to letter O
    O: "0", // Letter O to zero (try both)
    "1": "I", // One to letter I
    I: "1", // Letter I to one
    "5": "S", // Five to letter S
    S: "5", // Letter S to five
    "6": "G", // Six to letter G
    G: "6", // Letter G to six
    "8": "B", // Eight to letter B
    B: "8", // Letter B to eight
    "2": "Z", // Two to letter Z
    Z: "2", // Letter Z to two
  };

  // Apply corrections and return multiple possibilities
  const possibilities = [cleaned];

  // Try common substitutions
  for (const [from, to] of Object.entries(corrections)) {
    if (cleaned.includes(from)) {
      possibilities.push(cleaned.replace(new RegExp(from, "g"), to));
    }
  }

  // Return the original cleaned text
  return cleaned;
}

/**
 * Downloads an image from URL and saves it temporarily
 */
async function downloadImage(imageUrl: string, cookies?: string): Promise<string> {
  const response = await axios.get(imageUrl, {
    timeout: 10000,
    responseType: "arraybuffer",
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "Accept-Language": "es-ES,es;q=0.9",
      ...(cookies && { Cookie: cookies }),
      Referer: "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/",
      "Sec-Fetch-Dest": "image",
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Site": "same-origin",
    },
  });

  const imagePath = path.join(tempDir, `ocr_image_${Date.now()}.png`);
  await fs.writeFile(imagePath, response.data);
  return imagePath;
}

/**
 * Performs OCR on an image file
 */
async function performOCR(imagePath: string, options: any = {}): Promise<{ text: string; confidence: number; alternatives: string[] }> {
  const isServerless = process.env.VERCEL || options.serverless;

  if (isServerless) {
    console.log("🌐 Running in serverless environment - using basic OCR");

    try {
      // Serverless-compatible configuration
      const worker = await createWorker(["eng"], 1, {
        langPath: "https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/lang-data/",
        // Don't specify workerPath and corePath for serverless to use defaults
        logger: (m) => console.log("Tesseract:", m.status, m.progress),
      });

      await worker.setParameters({
        tessedit_char_whitelist: options.whitelist || "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        tessedit_pageseg_mode: options.psm || PSM.SINGLE_LINE,
        tessedit_ocr_engine_mode: OEM.TESSERACT_ONLY, // Use legacy engine for stability
      });

      const {
        data: { text, confidence },
      } = await worker.recognize(imagePath);
      await worker.terminate();

      const cleanText = cleanOcrText(text);
      return {
        text: cleanText,
        confidence: confidence,
        alternatives: [cleanText],
      };
    } catch (serverlessError) {
      console.error("❌ Serverless OCR failed:", serverlessError);
      throw new Error(`Serverless OCR failed: ${serverlessError instanceof Error ? serverlessError.message : "Unknown error"}`);
    }
  }

  // Local development - use full featured OCR
  console.log("🏠 Running in local environment - using advanced OCR");

  const worker = await createWorker(["eng"]);

  // Configure Tesseract for optimal recognition
  await worker.setParameters({
    tessedit_char_whitelist: options.whitelist || "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    tessedit_pageseg_mode: options.psm || PSM.SINGLE_LINE,
    tessedit_ocr_engine_mode: OEM.TESSERACT_LSTM_COMBINED,
    tessedit_do_invert: "1",
    classify_enable_learning: "0",
    classify_enable_adaptive_matcher: "0",
    textord_really_old_xheight: "1",
    textord_min_xheight: "10",
    preserve_interword_spaces: "0",
    edges_max_children_per_outline: "40",
    textord_noise_sizelimit: "0.5",
    tessedit_char_unblacklist: "",
    textord_min_linesize: "2.5",
  });

  // Try multiple recognition configurations
  const configs = [
    { psr: PSM.SINGLE_LINE, oem: OEM.TESSERACT_LSTM_COMBINED },
    { psr: PSM.SINGLE_WORD, oem: OEM.LSTM_ONLY },
    { psr: PSM.SINGLE_CHAR, oem: OEM.TESSERACT_ONLY },
    { psr: PSM.RAW_LINE, oem: OEM.TESSERACT_LSTM_COMBINED },
  ];

  const recognitionResults = [];

  for (const config of configs) {
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: config.psr,
        tessedit_ocr_engine_mode: config.oem,
      });

      const {
        data: { text, confidence },
      } = await worker.recognize(imagePath);
      const cleanText = cleanOcrText(text);

      if (cleanText && cleanText.length >= 3 && cleanText.length <= 12) {
        recognitionResults.push({
          text: cleanText,
          confidence: confidence,
          config: config,
        });
      }
    } catch (configError) {
      console.warn(`Recognition attempt failed with config:`, config, configError);
    }
  }

  await worker.terminate();

  // Sort by confidence and length preference
  recognitionResults.sort((a, b) => {
    // Prefer results with length 4-6 (typical CAPTCHA length)
    const aLengthScore = Math.abs(a.text.length - 5);
    const bLengthScore = Math.abs(b.text.length - 5);

    if (Math.abs(aLengthScore - bLengthScore) > 0.5) {
      return aLengthScore - bLengthScore;
    }

    return b.confidence - a.confidence;
  });

  const bestResult = recognitionResults[0];
  const alternatives = recognitionResults.slice(0, 3).map((r) => r.text);

  return {
    text: bestResult ? bestResult.text : "",
    confidence: bestResult ? bestResult.confidence : 0,
    alternatives: alternatives,
  };
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "OCR API",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// OCR endpoint - accepts image URL
app.post("/ocr", async (req, res) => {
  try {
    const { imageUrl, cookies, options = {} } = req.body;

    if (!imageUrl) {
      res.status(400).json({
        error: "Missing required parameter: imageUrl",
        example: {
          imageUrl: "https://example.com/captcha.png",
          cookies: "optional cookie string",
          options: {
            whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
            psm: "PSM.SINGLE_LINE",
            serverless: false,
          },
        },
      });
      return;
    }

    console.log(`🔍 Processing OCR request for: ${imageUrl}`);

    // Download the image
    const imagePath = await downloadImage(imageUrl, cookies);
    console.log(`📄 Image downloaded to: ${imagePath}`);

    // Perform OCR
    const result = await performOCR(imagePath, options);

    // Clean up temporary file
    try {
      await fs.unlink(imagePath);
      console.log(`🗑️ Temporary image deleted: ${imagePath}`);
    } catch (error) {
      console.warn(`Warning: Could not delete temporary image: ${error}`);
    }

    res.json({
      success: true,
      result: {
        text: result.text,
        confidence: result.confidence,
        alternatives: result.alternatives,
        length: result.text.length,
      },
      metadata: {
        imageUrl,
        timestamp: new Date().toISOString(),
        processingTime: Date.now(),
      },
    });
  } catch (error) {
    console.error("❌ OCR processing failed:", error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
    });
  }
});

// OCR endpoint - accepts base64 image
app.post("/ocr/base64", async (req, res) => {
  try {
    const { imageData, options = {} } = req.body;

    if (!imageData) {
      res.status(400).json({
        error: "Missing required parameter: imageData (base64 encoded image)",
        example: {
          imageData: "data:image/png;base64,iVBORw0KGgoAAAANSU...",
          options: {
            whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
            psm: "PSM.SINGLE_LINE",
          },
        },
      });
      return;
    }

    console.log(`🔍 Processing OCR request for base64 image`);

    // Parse base64 data
    const matches = imageData.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
      res.status(400).json({
        error: "Invalid base64 image format. Expected: data:image/[type];base64,[data]",
      });
      return;
    }

    const imageBuffer = Buffer.from(matches[2], "base64");
    const imagePath = path.join(tempDir, `ocr_base64_${Date.now()}.png`);
    await fs.writeFile(imagePath, imageBuffer);

    console.log(`📄 Base64 image saved to: ${imagePath}`);

    // Perform OCR
    const result = await performOCR(imagePath, options);

    // Clean up temporary file
    try {
      await fs.unlink(imagePath);
      console.log(`🗑️ Temporary image deleted: ${imagePath}`);
    } catch (error) {
      console.warn(`Warning: Could not delete temporary image: ${error}`);
    }

    res.json({
      success: true,
      result: {
        text: result.text,
        confidence: result.confidence,
        alternatives: result.alternatives,
        length: result.text.length,
      },
      metadata: {
        imageType: matches[1],
        timestamp: new Date().toISOString(),
        processingTime: Date.now(),
      },
    });
  } catch (error) {
    console.error("❌ Base64 OCR processing failed:", error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
    });
  }
});

// API documentation endpoint
app.get("/", (req, res) => {
  res.json({
    service: "OCR API Server",
    version: "1.0.0",
    endpoints: {
      "GET /health": "Health check",
      "POST /ocr": "Process image from URL",
      "POST /ocr/base64": "Process base64 encoded image",
      "GET /": "This documentation",
    },
    examples: {
      urlOcr: {
        method: "POST",
        url: "/ocr",
        body: {
          imageUrl: "https://example.com/captcha.png",
          cookies: "session=abc123; token=xyz789",
          options: {
            whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
            serverless: false,
          },
        },
      },
      base64Ocr: {
        method: "POST",
        url: "/ocr/base64",
        body: {
          imageData: "data:image/png;base64,iVBORw0KGgoAAAANSU...",
          options: {
            whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
          },
        },
      },
    },
  });
});

// Initialize server
async function startServer() {
  await ensureTempDirectory();

  app.listen(PORT, () => {
    console.log(`🚀 OCR API Server started!`);
    console.log(`📡 Server is running on: http://localhost:${PORT}`);
    console.log(`🔍 Available endpoints:`);
    console.log(`   GET /health - Health check`);
    console.log(`   POST /ocr - Process image from URL`);
    console.log(`   POST /ocr/base64 - Process base64 image`);
    console.log(`   GET / - API documentation`);
    console.log(`📝 Example requests:`);
    console.log(`   curl -X POST http://localhost:${PORT}/ocr -H "Content-Type: application/json" -d '{"imageUrl":"https://example.com/captcha.png"}'`);
    console.log(`🌐 Ready to receive OCR requests!`);
  });
}

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 OCR API Server shutting down...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 OCR API Server shutting down...");
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error("❌ Failed to start OCR API server:", error);
  process.exit(1);
});

export default app;
