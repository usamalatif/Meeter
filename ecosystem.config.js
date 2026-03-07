module.exports = {
  apps: [
    {
      name: 'api-server',
      script: './api/server.js',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 3001 }
    },
    {
      name: 'action-worker',
      script: './workers/action-queue.js',
      instances: 2,
      env: { NODE_ENV: 'production' }
    }
    // Bots are spawned dynamically per meeting — not managed by PM2
  ]
}
