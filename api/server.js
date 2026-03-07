require('dotenv').config()

const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const meetingsRouter = require('./routes/meetings')
const usersRouter = require('./routes/users')
const webhooksRouter = require('./routes/webhooks')

// Ensure tts-cache dir exists
const TTS_CACHE_DIR = path.join(__dirname, '..', 'tts-cache')
if (!fs.existsSync(TTS_CACHE_DIR)) fs.mkdirSync(TTS_CACHE_DIR, { recursive: true })

const app = express()

// CORS for Next.js dashboard
app.use(cors({
  origin: process.env.DASHBOARD_URL || 'http://localhost:3000',
  credentials: true
}))

// Clerk auth middleware (optional — skipped if keys not configured)
const hasClerkKeys = process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY
if (hasClerkKeys) {
  const { clerkMiddleware, requireAuth } = require('@clerk/express')
  app.use(clerkMiddleware())
}

// Stripe needs raw body; Recall routes apply express.json() themselves
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }), webhooksRouter)
app.use('/webhooks', webhooksRouter)

// JSON body parser for all other routes
app.use(express.json())

// API routes (auth required in production, open in dev without Clerk keys)
if (hasClerkKeys) {
  const { requireAuth } = require('@clerk/express')
  app.use('/api/meetings', requireAuth(), meetingsRouter)
  app.use('/api/users', requireAuth(), usersRouter)
} else {
  console.warn('[API] Clerk keys not found — running without authentication')
  app.use('/api/meetings', meetingsRouter)
  app.use('/api/users', usersRouter)
}

// Serve TTS audio files publicly so Recall.ai can fetch them by URL
app.use('/audio', express.static(TTS_CACHE_DIR))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`[API] Running on port ${PORT}`)
})

module.exports = app
