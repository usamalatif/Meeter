const router = require('express').Router()
const db = require('../../db')

// GET /api/users/me
router.get('/me', async (req, res) => {
  try {
    let user = await db.getUserByClerkId(req.auth().userId)

    // Auto-create user on first API call
    if (!user) {
      // Get email from Clerk session claims
      const email = req.auth().sessionClaims?.email || `${req.auth().userId}@placeholder.com`
      user = await db.createUser({ clerkId: req.auth().userId, email })
    }

    const userWithIntegrations = await db.getUserWithIntegrations(user.id)
    res.json(userWithIntegrations)
  } catch (err) {
    console.error('[API] Get user error:', err)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// POST /api/users/integrations
router.post('/integrations', async (req, res) => {
  try {
    const { service, credentials, config } = req.body
    const user = await db.getUserByClerkId(req.auth().userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const integration = await db.saveIntegration(user.id, service, credentials, config)
    res.json(integration)
  } catch (err) {
    console.error('[API] Save integration error:', err)
    res.status(500).json({ error: 'Failed to save integration' })
  }
})

// DELETE /api/users/integrations/:service
router.delete('/integrations/:service', async (req, res) => {
  try {
    const user = await db.getUserByClerkId(req.auth().userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    await db.removeIntegration(user.id, req.params.service)
    res.json({ success: true })
  } catch (err) {
    console.error('[API] Remove integration error:', err)
    res.status(500).json({ error: 'Failed to remove integration' })
  }
})

module.exports = router
