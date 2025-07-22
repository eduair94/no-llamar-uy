#!/bin/bash

# PM2 Startup Script for OCR API and Main API
# Usage: bash pm2-start.sh [environment] [port]
# Example: bash pm2-start.sh production 3001

set -e

ENVIRONMENT=${1:-development}
OCR_PORT=${2:-${OCR_PORT:-3001}}
MAIN_PORT=${3:-${PORT:-3000}}

echo "🚀 Starting services with PM2..."
echo "📊 Environment: $ENVIRONMENT"
echo "🔍 OCR API Port: $OCR_PORT"
echo "🌐 Main API Port: $MAIN_PORT"

# Export environment variables for PM2
export NODE_ENV=$ENVIRONMENT
export OCR_PORT=$OCR_PORT
export PORT=$MAIN_PORT
export OCR_API_URL="http://localhost:$OCR_PORT"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Stop any existing PM2 processes
echo "🛑 Stopping existing PM2 processes..."
pm2 delete ecosystem.config.js 2>/dev/null || true

# Start services with PM2
echo "▶️ Starting services..."
if [ "$ENVIRONMENT" = "production" ]; then
    pm2 start ecosystem.config.js --env production
else
    pm2 start ecosystem.config.js
fi

# Show status
echo "📊 PM2 Status:"
pm2 status

# Show logs command
echo ""
echo "📝 To view logs, run:"
echo "   pm2 logs"
echo ""
echo "🔧 To manage services:"
echo "   pm2 status          - Show status"
echo "   pm2 restart all     - Restart all services"
echo "   pm2 stop all        - Stop all services"
echo "   pm2 delete all      - Delete all services"
echo ""
echo "🌐 Services should be running on:"
echo "   Main API: http://localhost:$MAIN_PORT"
echo "   OCR API:  http://localhost:$OCR_PORT"
echo ""
echo "✅ Startup complete!"
