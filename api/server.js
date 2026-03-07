require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { clerkMiddleware, requireAuth } = require('@clerk/express')
const meetingsRouter = require('./routes/meetings')
const usersRouter = require('./routes/users')
const webhooksRouter = require('./routes/webhooks')

const app = express()

// CORS for Next.js dashboard
app.use(cors({
  origin: process.env.DASHBOARD_URL || 'http://localhost:3000',
  credentials: true
}))

// Clerk auth middleware
app.use(clerkMiddleware())

// Stripe webhooks need raw body — must come before express.json()
app.use('/webhooks', express.raw({ type: 'application/json' }), webhooksRouter)

// JSON body parser for all other routes
app.use(express.json())

// API routes (auth required)
app.use('/api/meetings', requireAuth(), meetingsRouter)
app.use('/api/users', requireAuth(), usersRouter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`[API] Running on port ${PORT}`)
})

module.exports = app
