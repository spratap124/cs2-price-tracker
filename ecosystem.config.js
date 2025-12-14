export default {
  apps: [
    {
      name: "cs2-price-tracker",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3001
      },
      // PM2 will load .env.production automatically when NODE_ENV=production
      // Make sure to create .env.production file with your configuration
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      watch: false,
      max_memory_restart: "500M"
    }
  ]
};
