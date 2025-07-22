module.exports = {
  apps: [
    {
      name: 'ocr-api',
      script: 'src/ocr-api.ts',
      interpreter: 'node',
      interpreter_args: '--loader ts-node/esm --experimental-specifier-resolution=node',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        OCR_PORT: process.env.OCR_PORT || 3001,
        TS_NODE_PROJECT: './tsconfig.json'
      },
      env_production: {
        NODE_ENV: 'production',
        OCR_PORT: process.env.OCR_PORT || 3001,
        TS_NODE_PROJECT: './tsconfig.json'
      },
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      cron_restart: '0 2 * * *', // Restart daily at 2 AM
    },
    {
      name: 'main-api',
      script: 'src/index.ts',
      interpreter: 'node',
      interpreter_args: '--loader ts-node/esm --experimental-specifier-resolution=node',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: process.env.PORT || 3000,
        OCR_API_URL: process.env.OCR_API_URL || `http://localhost:${process.env.OCR_PORT || 3001}`,
        TS_NODE_PROJECT: './tsconfig.json'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
        OCR_API_URL: process.env.OCR_API_URL || `http://localhost:${process.env.OCR_PORT || 3001}`,
        TS_NODE_PROJECT: './tsconfig.json'
      },
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

  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/master',
      repo: 'https://github.com/eduair94/no-llamar-uy.git',
      path: '/var/www/no-llamar-api',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production',
        OCR_PORT: 3001,
        PORT: 3000
      }
    },
    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'https://github.com/eduair94/no-llamar-uy.git',
      path: '/var/www/no-llamar-api-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
        OCR_PORT: 3101,
        PORT: 3100
      }
    }
  }
};
