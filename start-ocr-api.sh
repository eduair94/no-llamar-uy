#!/bin/bash

# Start OCR API Server
echo "🚀 Starting OCR API Server..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the OCR API server
echo "🌐 Starting server on port 3001..."
npx ts-node src/ocr-api.ts
