import axios from "axios";
import { promises as fs } from "fs";
import * as path from "path";
import { createWorker, OEM, PSM } from "tesseract.js";

export interface OCRResult {
  success: boolean;
  text?: string;
  cleanedText?: string;
  confidence?: number;
  error?: string;
  processingTime?: number;
  imageUrl?: string;
  timestamp: string;
}

export class OCRService {
  private readonly outputDir = path.join(__dirname, "..", "temp");

  constructor() {
    this.ensureOutputDirectory();
  }

  /**
   * Ensures the output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error("Error creating output directory:", error);
    }
  }

  /**
   * Processes an image URL or base64 string and extracts text using OCR
   * @param imageInput - The URL of the image or base64 encoded image to process
   * @param options - OCR configuration options
   * @returns Promise<OCRResult> - The OCR result
   */
  async processImageUrl(
    imageInput: string,
    options: {
      cookies?: string;
      charWhitelist?: string;
      useAdvanced?: boolean;
      captchaMode?: boolean;
    } = {}
  ): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // Detect if input is base64 or URL
      const isBase64 = this.isBase64Image(imageInput);

      if (isBase64) {
        console.log(`🔍 Processing base64 image (${imageInput.length} characters)`);
      } else {
        console.log(`🔍 Processing image URL: ${imageInput}`);
      }

      // Get image buffer
      const imageBuffer = isBase64 ? this.base64ToBuffer(imageInput) : await this.downloadImage(imageInput, options.cookies);

      // Save temporarily
      const tempImagePath = path.join(this.outputDir, `ocr_${Date.now()}.png`);
      await fs.writeFile(tempImagePath, imageBuffer);

      console.log(`📄 Image saved temporarily to: ${tempImagePath}`);

      // Process with OCR
      const ocrResult = options.useAdvanced ? await this.processWithAdvancedOCR(tempImagePath, options) : await this.processWithBasicOCR(tempImagePath, options);

      // Clean up temp file
      try {
        await fs.unlink(tempImagePath);
        console.log(`🗑️ Temporary image deleted: ${tempImagePath}`);
      } catch (error) {
        console.warn(`Warning: Could not delete temporary image: ${error}`);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        text: ocrResult.text,
        cleanedText: ocrResult.cleanedText,
        confidence: ocrResult.confidence,
        processingTime,
        imageUrl: isBase64 ? "base64-image" : imageInput,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`❌ Error processing image:`, error);

      const processingTime = Date.now() - startTime;

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        processingTime,
        imageUrl: this.isBase64Image(imageInput) ? "base64-image" : imageInput,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Downloads an image from a URL
   * @param imageUrl - The URL to download from
   * @returns Promise<Buffer> - The image buffer
   */
  private async downloadImage(imageUrl: string, cookies?: string): Promise<Buffer> {
    try {
      const response = await axios.get(imageUrl, {
        timeout: 10000,
        responseType: "arraybuffer",
        headers: {
          cookies: cookies || "",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Accept-Language": "es-ES,es;q=0.9",
        },
      });

      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to download image: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Processes image with basic OCR configuration
   * @param imagePath - Path to the image file
   * @param options - OCR options
   * @returns Promise with OCR results
   */
  private async processWithBasicOCR(imagePath: string, options: { charWhitelist?: string; captchaMode?: boolean }): Promise<{ text: string; cleanedText: string; confidence: number }> {
    console.log("🏠 Using basic OCR processing");

    // Initialize Tesseract worker
    const worker = await createWorker(["eng"]);

    // Configure for basic recognition
    const charWhitelist = options.charWhitelist || (options.captchaMode ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" : "");

    await worker.setParameters({
      ...(charWhitelist && { tessedit_char_whitelist: charWhitelist }),
      tessedit_pageseg_mode: options.captchaMode ? PSM.SINGLE_LINE : PSM.AUTO,
      tessedit_ocr_engine_mode: OEM.TESSERACT_LSTM_COMBINED,
    });

    const {
      data: { text, confidence },
    } = await worker.recognize(imagePath);
    const cleanedText = options.captchaMode ? this.cleanCaptchaText(text) : text.trim();

    await worker.terminate();

    console.log(`🔍 Basic OCR result: "${cleanedText}" (confidence: ${confidence})`);

    return { text, cleanedText, confidence };
  }

  /**
   * Processes image with advanced OCR configuration and multiple attempts
   * @param imagePath - Path to the image file
   * @param options - OCR options
   * @returns Promise with OCR results
   */
  private async processWithAdvancedOCR(imagePath: string, options: { charWhitelist?: string; captchaMode?: boolean }): Promise<{ text: string; cleanedText: string; confidence: number }> {
    console.log("🚀 Using advanced OCR processing");

    // Initialize Tesseract worker
    const worker = await createWorker(["eng"]);

    const charWhitelist = options.charWhitelist || (options.captchaMode ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" : "");

    // Configure Tesseract for optimal recognition (matching PhoneChecker implementation)
    await worker.setParameters({
      // Character whitelist - only alphanumeric characters
      tessedit_char_whitelist: charWhitelist,
      // Page segmentation mode - treat the image as a single text line
      tessedit_pageseg_mode: options.captchaMode ? PSM.SINGLE_LINE : PSM.AUTO,
      // OCR Engine Mode - use both legacy and LSTM engines for better accuracy
      tessedit_ocr_engine_mode: OEM.TESSERACT_LSTM_COMBINED,
      ...(options.captchaMode && {
        // Improve recognition for small text
        tessedit_do_invert: "1",
        // Additional parameters for better CAPTCHA recognition
        classify_enable_learning: "0",
        classify_enable_adaptive_matcher: "0",
        textord_really_old_xheight: "1",
        textord_min_xheight: "10",
        preserve_interword_spaces: "0",
        // Improve edge detection
        edges_max_children_per_outline: "40",
        // Noise reduction
        textord_noise_sizelimit: "0.5",
        // Improve character recognition
        tessedit_char_unblacklist: "",
        // Better handling of small fonts
        textord_min_linesize: "2.5",
      }),
    });

    let recognitionResults = [];

    // Try recognition with different configurations for better accuracy (matching PhoneChecker)
    const configs = [
      { psr: PSM.SINGLE_LINE, oem: OEM.TESSERACT_LSTM_COMBINED },
      { psr: PSM.SINGLE_WORD, oem: OEM.LSTM_ONLY },
      { psr: PSM.SINGLE_CHAR, oem: OEM.TESSERACT_ONLY },
      { psr: PSM.RAW_LINE, oem: OEM.TESSERACT_LSTM_COMBINED },
    ];

    for (const config of configs) {
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: config.psr,
          tessedit_ocr_engine_mode: config.oem,
        });

        const {
          data: { text, confidence },
        } = await worker.recognize(imagePath);
        const cleanedText = options.captchaMode ? this.cleanCaptchaText(text) : text.trim();

        // For CAPTCHA mode, filter by length (matching PhoneChecker logic)
        if (cleanedText && (!options.captchaMode || (cleanedText.length >= 4 && cleanedText.length <= 8))) {
          recognitionResults.push({
            text,
            cleanedText,
            confidence,
            config,
          });
        }
      } catch (configError) {
        console.warn(`Recognition attempt failed with config:`, config, configError);
      }
    }

    await worker.terminate();

    // Sort by confidence and length preference for CAPTCHAs (matching PhoneChecker logic)
    if (options.captchaMode) {
      recognitionResults.sort((a, b) => {
        // Prefer results with length 5-6 (typical CAPTCHA length)
        const aLengthScore = Math.abs(a.cleanedText.length - 5.5);
        const bLengthScore = Math.abs(b.cleanedText.length - 5.5);

        if (Math.abs(aLengthScore - bLengthScore) > 0.5) {
          return aLengthScore - bLengthScore;
        }

        // Then prefer higher confidence
        return b.confidence - a.confidence;
      });
    } else {
      // For general OCR, just sort by confidence
      recognitionResults.sort((a, b) => b.confidence - a.confidence);
    }

    const bestResult = recognitionResults[0];

    if (!bestResult) {
      throw new Error("No valid OCR results found");
    }

    console.log(
      `🔍 Advanced OCR results (top 3):`,
      recognitionResults.slice(0, 3).map((r) => ({
        text: r.cleanedText,
        confidence: r.confidence,
      }))
    );
    console.log(`🏆 Best result: "${bestResult.cleanedText}" (confidence: ${bestResult.confidence})`);

    return {
      text: bestResult.text,
      cleanedText: bestResult.cleanedText,
      confidence: bestResult.confidence,
    };
  }

  /**
   * Cleans and normalizes CAPTCHA text recognition results
   * @param rawText - Raw text from OCR recognition
   * @returns Cleaned text suitable for CAPTCHA submission
   */
  private cleanCaptchaText(rawText: string): string {
    if (!rawText) return "";

    // Remove all non-alphanumeric characters
    let cleaned = rawText.replace(/[^a-zA-Z0-9]/g, "");

    // Common OCR misrecognitions for CAPTCHAs (matching PhoneChecker implementation)
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

    // Return the original cleaned text (we might want to try alternatives later)
    return cleaned;
  }

  /**
   * Checks if the input string is a base64 encoded image
   * @param input - The input string to check
   * @returns boolean indicating if it's a base64 image
   */
  private isBase64Image(input: string): boolean {
    // Check for data URL format
    if (input.startsWith("data:image/")) {
      return true;
    }

    // Check for raw base64 (heuristic: very long string without URL patterns)
    if (!input.startsWith("http://") && !input.startsWith("https://") && input.length > 100 && /^[A-Za-z0-9+/]+=*$/.test(input.replace(/\s/g, ""))) {
      return true;
    }

    return false;
  }

  /**
   * Converts base64 string to Buffer
   * @param base64String - The base64 string (with or without data URL prefix)
   * @returns Buffer containing the image data
   */
  private base64ToBuffer(base64String: string): Buffer {
    try {
      // Remove data URL prefix if present
      let base64Data = base64String;
      if (base64String.startsWith("data:image/")) {
        const base64Index = base64String.indexOf(",");
        if (base64Index !== -1) {
          base64Data = base64String.substring(base64Index + 1);
        }
      }

      // Remove any whitespace
      base64Data = base64Data.replace(/\s/g, "");

      // Convert to buffer
      return Buffer.from(base64Data, "base64");
    } catch (error) {
      throw new Error(`Failed to convert base64 to buffer: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Validates if a string is a valid URL
   * @param urlString - The string to validate
   * @returns boolean indicating if it's a valid URL
   */
  private isValidUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }
}
