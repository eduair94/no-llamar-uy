module.exports = {
  apps: [
    {
      name: 'ocr-api',
      script: 'ts-node',
      args: 'src/ocr-api.ts',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        OCR_PORT: process.env.OCR_PORT || 3001,
        TS_NODE_PROJECT: './tsconfig.json',
        TS_NODE_COMPILER_OPTIONS: '{"module":"commonjs"}'
      },
      env_production: {
        NODE_ENV: 'production',
        OCR_PORT: process.env.OCR_PORT || 3001,
        TS_NODE_PROJECT: './tsconfig.json',
        TS_NODE_COMPILER_OPTIONS: '{"module":"commonjs"}'
      },
      error_file: './logs/ocr-api-error.log',
      out_file: './logs/ocr-api-out.log',
      log_file: './logs/ocr-api-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
    },
    {
      name: 'main-api',
      script: 'ts-node',
      args: 'src/index.ts',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: process.env.PORT || 3000,
        OCR_API_URL: process.env.OCR_API_URL || `http://localhost:${process.env.OCR_PORT || 3001}`,
        TS_NODE_PROJECT: './tsconfig.json',
        TS_NODE_COMPILER_OPTIONS: '{"module":"commonjs"}'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
        OCR_API_URL: process.env.OCR_API_URL || `http://localhost:${process.env.OCR_PORT || 3001}`,
        TS_NODE_PROJECT: './tsconfig.json',
        TS_NODE_COMPILER_OPTIONS: '{"module":"commonjs"}'
      },
      error_file: './logs/main-api-error.log',
      out_file: './logs/main-api-out.log',
      log_file: './logs/main-api-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
    }
  ]
};
