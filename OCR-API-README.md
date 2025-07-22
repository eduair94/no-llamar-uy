# OCR API Service

A dedicated Express.js microservice for OCR (Optical Character Recognition) processing using Tesseract.js.

## Overview

This OCR API service was created to handle image text extraction in environments where running Tesseract.js directly might face limitations (like serverless platforms). It provides a robust HTTP API for OCR processing with rate limiting and comprehensive error handling.

## Features

- 🔍 **Multiple OCR Modes**: Basic and advanced processing with different PSM (Page Segmentation Mode) configurations
- 🎯 **CAPTCHA Specialized**: Dedicated endpoint optimized for CAPTCHA text extraction
- 📦 **Batch Processing**: Process multiple images in a single request
- ⚡ **Rate Limiting**: Built-in rate limiting to prevent abuse
- 🛡️ **Error Handling**: Comprehensive error handling and validation
- 🌐 **CORS Enabled**: Cross-Origin Resource Sharing support

## Quick Start

### 1. Start the OCR API Server

```bash
# Start the server on port 3001
npm run start:ocr

# Or for development with auto-reload
npm run dev:ocr
```

### 2. Test the API

```bash
# Run the test suite
npm run test:ocr
```

## API Endpoints

### Health Check
```http
GET /health
```

### Single Image OCR
```http
POST /ocr
Content-Type: application/json

{
  "imageUrl": "https://example.com/image.png",
  "mode": "advanced" // optional: "basic" or "advanced"
}
```

### CAPTCHA Processing
```http
POST /ocr/captcha
Content-Type: application/json

{
  "imageUrl": "https://example.com/captcha.png"
}
```

### Batch Processing
```http
POST /ocr/batch
Content-Type: application/json

{
  "images": [
    { "id": "img1", "url": "https://example.com/image1.png" },
    { "id": "img2", "url": "https://example.com/image2.png" }
  ]
}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "text": "Extracted text",
  "confidence": 85.5,
  "processingTime": 1250,
  "mode": "advanced"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3001)
- `RATE_LIMIT_WINDOW`: Rate limit window in minutes (default: 15)
- `RATE_LIMIT_MAX`: Max requests per window (default: 100)

### OCR Configuration

The service uses Tesseract.js with optimized configurations:

- **Basic Mode**: PSM 7 (single text line)
- **Advanced Mode**: PSM 6 (uniform block) with preprocessing
- **CAPTCHA Mode**: Specialized for CAPTCHA text extraction

## Integration with Main API

The PhoneChecker class automatically detects serverless environments and uses this OCR API:

```typescript
// In Vercel serverless environment
const isVercel = !!process.env.VERCEL;
if (isVercel) {
  // Uses external OCR API
  const response = await axios.post(`${OCR_API_URL}/ocr/captcha`, {
    imageUrl: captchaUrl
  });
}
```

## Development

### Project Structure

```
src/
├── ocr-api.ts        # Express server
├── OCRService.ts     # OCR processing logic
└── PhoneChecker.ts   # Main API (uses OCR service)
```

### Testing

```bash
# Test the OCR API
npm run test:ocr

# Test the main phone validation API
npm run test:phone
```

### Deployment

This OCR API should be deployed separately from the main Vercel serverless functions to avoid WASM loading limitations in serverless environments.

## Rate Limiting

- **Window**: 15 minutes (configurable)
- **Limit**: 100 requests per IP per window (configurable)
- **Headers**: Rate limit information in response headers

## Error Codes

- `INVALID_REQUEST`: Missing or invalid request parameters
- `IMAGE_DOWNLOAD_FAILED`: Failed to download image from URL
- `OCR_PROCESSING_FAILED`: OCR processing encountered an error
- `RATE_LIMIT_EXCEEDED`: Too many requests from IP

## License

MIT
