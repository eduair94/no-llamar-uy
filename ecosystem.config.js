module.exports = {
  apps: [
    {
      name: 'ocr-api',
      script: 'dist/ocr-api.js',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      env: {
        OCR_PORT: process.env.OCR_PORT || 3001,
      },
      kill_timeout: 5000,
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      cron_restart: '0 2 * * *', // Restart daily at 2 AM
    },
    {
      name: 'main-api',
      script: 'dist/index.js',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      cron_restart: '0 2 * * *', // Restart daily at 2 AM
    }
  ],
};
