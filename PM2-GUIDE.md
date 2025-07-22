# PM2 Process Management Guide

This document explains how to use PM2 to manage the OCR API and Main API services.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Services with PM2
```bash
# Start all services
npm run pm2:start

# Or start individually
npm run pm2:ocr    # Start only OCR API
npm run pm2:main   # Start only Main API
```

### 3. Check Status
```bash
npm run pm2:status
```

## Environment Configuration

### Setting Custom Ports

You can set custom ports using environment variables:

```bash
# Set OCR API port
export OCR_PORT=3001

# Set Main API port  
export PORT=3000

# Start with custom ports
npm run pm2:start
```

### Windows Command Prompt
```cmd
set OCR_PORT=3001
set PORT=3000
npm run pm2:start
```

### Windows PowerShell
```powershell
$env:OCR_PORT = "3001"
$env:PORT = "3000"
npm run pm2:start
```

## Available NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run pm2:start` | Start all services |
| `npm run pm2:stop` | Stop all services |
| `npm run pm2:restart` | Restart all services |
| `npm run pm2:reload` | Gracefully reload all services |
| `npm run pm2:delete` | Delete all services |
| `npm run pm2:logs` | View logs for all services |
| `npm run pm2:status` | Show status of all services |
| `npm run pm2:ocr` | Start only OCR API |
| `npm run pm2:main` | Start only Main API |

## PM2 Commands

### Basic Operations
```bash
# Start services
pm2 start ecosystem.config.js

# Start with environment
pm2 start ecosystem.config.js --env production

# Stop all services
pm2 stop all

# Restart all services
pm2 restart all

# Delete all services
pm2 delete all
```

### Monitoring
```bash
# Show status
pm2 status

# View logs
pm2 logs

# View logs for specific service
pm2 logs ocr-api
pm2 logs main-api

# Monitor resources
pm2 monit
```

### Individual Service Management
```bash
# Start only OCR API
pm2 start ecosystem.config.js --only ocr-api

# Start only Main API
pm2 start ecosystem.config.js --only main-api

# Restart specific service
pm2 restart ocr-api
pm2 restart main-api

# Stop specific service
pm2 stop ocr-api
pm2 stop main-api
```

## Configuration Files

### ecosystem.config.js
Main PM2 configuration with full features including deployment configuration.

### ecosystem.simple.config.js
Simplified configuration optimized for Windows and local development.

To use the simple configuration:
```bash
pm2 start ecosystem.simple.config.js
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OCR_PORT` | 3001 | Port for OCR API service |
| `PORT` | 3000 | Port for Main API service |
| `NODE_ENV` | development | Environment mode |
| `OCR_API_URL` | http://localhost:3001 | URL for OCR API service |

## Logs

Logs are stored in the `./logs/` directory:

- `ocr-api-out.log` - OCR API stdout logs
- `ocr-api-error.log` - OCR API error logs  
- `ocr-api-combined.log` - OCR API combined logs
- `main-api-out.log` - Main API stdout logs
- `main-api-error.log` - Main API error logs
- `main-api-combined.log` - Main API combined logs

### Viewing Logs
```bash
# View all logs in real-time
pm2 logs

# View specific service logs
pm2 logs ocr-api
pm2 logs main-api

# View logs with filters
pm2 logs --lines 50
pm2 logs --err
pm2 logs --out
```

## Production Deployment

### Setting Up Production Environment
```bash
# Set production environment
export NODE_ENV=production
export OCR_PORT=3001
export PORT=3000

# Start with production configuration
pm2 start ecosystem.config.js --env production
```

### Auto-restart on System Boot
```bash
# Save current PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

# Follow the instructions provided by the startup command
```

### Zero-downtime Deployment
```bash
# Reload services without downtime
pm2 reload ecosystem.config.js

# Or reload specific service
pm2 reload ocr-api
pm2 reload main-api
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   netstat -ano | findstr :3001
   
   # Kill the process (Windows)
   taskkill /PID <process_id> /F
   ```

2. **Service Won't Start**
   ```bash
   # Check logs for errors
   pm2 logs ocr-api --lines 50
   
   # Check service status
   pm2 describe ocr-api
   ```

3. **High Memory Usage**
   ```bash
   # Monitor resources
   pm2 monit
   
   # Restart if memory is high
   pm2 restart ocr-api
   ```

4. **TypeScript Compilation Issues**
   ```bash
   # Check TypeScript compilation
   npx tsc --noEmit
   
   # Clear TypeScript cache
   npx tsc --build --clean
   ```

### Performance Tuning

1. **Adjust Memory Limits**
   Edit `ecosystem.config.js` and modify `max_memory_restart`:
   ```javascript
   max_memory_restart: '2G', // Increase memory limit
   ```

2. **Enable Clustering** (for production)
   ```javascript
   instances: 'max', // Use all CPU cores
   exec_mode: 'cluster'
   ```

3. **Optimize Restart Settings**
   ```javascript
   min_uptime: '30s',     // Minimum uptime before restart
   max_restarts: 5,       // Maximum restarts per period
   restart_delay: 2000    // Delay between restarts
   ```

## Service Health Checks

### OCR API Health Check
```bash
curl http://localhost:3001/health
```

### Main API Health Check
```bash
curl http://localhost:3000/api/health
```

### Automated Health Monitoring
PM2 can be configured to automatically restart services based on health checks:

```javascript
// Add to ecosystem.config.js
health_check_url: 'http://localhost:3001/health',
health_check_grace_period: 3000,
```

## Backup and Recovery

### Backup PM2 Configuration
```bash
# Save current configuration
pm2 save

# Export configuration
pm2 dump > pm2.backup.json
```

### Restore PM2 Configuration
```bash
# Restore from backup
pm2 resurrect
```

This guide covers the essential PM2 operations for managing your OCR API and Main API services. For more advanced features, refer to the [official PM2 documentation](https://pm2.keymetrics.io/docs/).
