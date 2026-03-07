module.exports = {
  apps: [
    {
      name: 'api',
      script: './api/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: { NODE_ENV: 'production', PORT: 3001 }
    },
    {
      name: 'worker',
      script: './workers/action-queue.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'dashboard',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: './dashboard',
      instances: 1,
      autorestart: true,
      watch: false,
      env: { NODE_ENV: 'production', PORT: 3000 }
    }
  ]
}
