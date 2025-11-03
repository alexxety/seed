module.exports = {
  apps: [
    {
      name: 'telegram-shop-prod',
      script: './dist/server.js',
      cwd: '/var/www/telegram-shop',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/pm2/telegram-shop-prod-error.log',
      out_file: '/var/log/pm2/telegram-shop-prod-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      kill_timeout: 5000
    },
    {
      name: 'telegram-shop-dev',
      script: './dist/server.js',
      cwd: '/var/www/telegram-shop-dev',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      error_file: '/var/log/pm2/telegram-shop-dev-error.log',
      out_file: '/var/log/pm2/telegram-shop-dev-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '5s',
      max_restarts: 5,
      restart_delay: 2000,
      kill_timeout: 3000,
      listen_timeout: 5000
    }
  ]
};
