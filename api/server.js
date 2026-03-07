require('dotenv').config()

const express = require('express')
const cors = require('cors')
const meetingsRouter = require('./routes/meetings')
const usersRouter = require('./routes/users')
const webhooksRouter = require('./routes/webhooks')

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

// Stripe webhooks need raw body — must come before express.json()
app.use('/webhooks', express.raw({ type: 'application/json' }), webhooksRouter)

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`[API] Running on port ${PORT}`)
})

module.exports = app
