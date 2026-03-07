const router = require('express').Router()
const { launchMeetBot } = require('../../bots/bot-orchestrator')
const db = require('../../db')

// POST /api/meetings/schedule
router.post('/schedule', async (req, res) => {
  try {
    const { meetingUrl, title, attendees, config } = req.body
    const { userId, sessionClaims } = req.auth()

    const platform = meetingUrl.includes('zoom.us') ? 'zoom'
                   : meetingUrl.includes('meet.google.com') ? 'meet'
                   : null

    if (!platform) {
      return res.status(400).json({ error: 'Unsupported platform. Use Zoom or Google Meet.' })
    }

    // Get or auto-create user
    let user = await db.getUserByClerkId(userId)
    if (!user) {
      const email = sessionClaims?.email || `${userId}@placeholder.com`
      user = await db.createUser({ clerkId: userId, email })
    }

    if (user.minutes_used >= user.minutes_quota) {
      return res.status(402).json({ error: 'Meeting minutes quota exceeded. Please upgrade your plan.' })
    }

    const meeting = await db.createMeeting({
      userId: user.id,
      platform,
      meetingUrl,
      title,
      attendees,
      config
    })

    // Launch bot non-blocking
    launchMeetBot(meeting).catch(e => console.error('[API] Bot launch failed:', e))

    res.json({ meetingId: meeting.id, status: 'bot_joining', platform })
  } catch (err) {
    console.error('[API] Schedule error:', err)
    res.status(500).json({ error: 'Failed to schedule meeting' })
  }
})

// GET /api/meetings/:id
router.get('/:id', async (req, res) => {
  try {
    const { userId } = req.auth()
    const meeting = await db.getMeetingWithOutput(req.params.id, userId)
    if (!meeting) return res.status(404).json({ error: 'Not found' })
    res.json(meeting)
  } catch (err) {
    console.error('[API] Get meeting error:', err)
    res.status(500).json({ error: 'Failed to fetch meeting' })
  }
})

// GET /api/meetings
router.get('/', async (req, res) => {
  try {
    const { userId, sessionClaims } = req.auth()
    let user = await db.getUserByClerkId(userId)
    if (!user) {
      const email = sessionClaims?.email || `${userId}@placeholder.com`
      user = await db.createUser({ clerkId: userId, email })
    }

    const meetings = await db.getUserMeetings(userId, {
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0
    })
    res.json(meetings)
  } catch (err) {
    console.error('[API] List meetings error:', err)
    res.status(500).json({ error: 'Failed to list meetings' })
  }
})

module.exports = router
