// PM2 ecosystem config — VPS deploy için alternatif
// Kullanım: pm2 start ecosystem.config.cjs --env production

module.exports = {
  apps: [
    {
      name: 'mei-bot',
      script: 'index.js',
      instances: 1,          // Discord bot tek instance çalışmalı
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
