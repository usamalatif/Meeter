const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
})

// ─── Users ───────────────────────────────────────────────────────────────────

async function getUserById(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  )
  return rows[0] || null
}

async function getUserByClerkId(clerkId) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE clerk_id = $1',
    [clerkId]
  )
  return rows[0] || null
}

async function createUser({ clerkId, email }) {
  const { rows } = await pool.query(
    'INSERT INTO users (clerk_id, email) VALUES ($1, $2) RETURNING *',
    [clerkId, email]
  )
  return rows[0]
}

async function updateUserPlan(clerkId, { plan, minutesQuota, stripeCustomerId }) {
  const { rows } = await pool.query(
    `UPDATE users SET plan = $1, minutes_quota = $2, stripe_customer_id = COALESCE($3, stripe_customer_id)
     WHERE clerk_id = $4 RETURNING *`,
    [plan, minutesQuota, stripeCustomerId, clerkId]
  )
  return rows[0]
}

async function getUserWithIntegrations(userId) {
  const user = await getUserById(userId)
  if (!user) return null

  const { rows: integrations } = await pool.query(
    'SELECT service, credentials, config FROM user_integrations WHERE user_id = $1 AND is_active = true',
    [userId]
  )

  const integrationsMap = {}
  for (const row of integrations) {
    integrationsMap[row.service] = { ...row.credentials, config: row.config }
  }

  return { ...user, integrations: integrationsMap }
}

async function notifyUserPaymentFailed(stripeCustomerId) {
  // Mark user plan as past_due
  await pool.query(
    "UPDATE users SET plan = 'past_due' WHERE stripe_customer_id = $1",
    [stripeCustomerId]
  )
}

// ─── Meetings ────────────────────────────────────────────────────────────────

async function createMeeting({ userId, platform, meetingUrl, title, attendees, config }) {
  const { rows } = await pool.query(
    `INSERT INTO meetings (user_id, platform, meeting_url, title, attendees, config)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, platform, meetingUrl, title, attendees || [], config || {}]
  )
  return rows[0]
}

async function updateMeetingStatus(meetingId, status) {
  const updates = { status }
  if (status === 'active') updates.started_at = new Date()
  if (status === 'completed') updates.ended_at = new Date()

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ')
  const values = Object.values(updates)

  await pool.query(
    `UPDATE meetings SET ${setClauses} WHERE id = $1`,
    [meetingId, ...values]
  )
}

async function getMeetingWithConfig(meetingId) {
  const { rows } = await pool.query(
    'SELECT * FROM meetings WHERE id = $1',
    [meetingId]
  )
  const meeting = rows[0]
  if (!meeting) return null
  meeting.config = meeting.config || {}
  return meeting
}

async function getMeetingWithOutput(meetingId, userId) {
  const { rows } = await pool.query(
    `SELECT m.*, mo.transcript, mo.summary, mo.key_decisions, mo.action_items,
            mo.unresolved_items, mo.follow_up_email, mo.jira_tickets,
            mo.next_agenda, mo.slack_summary, mo.actions_taken
     FROM meetings m
     LEFT JOIN meeting_outputs mo ON mo.meeting_id = m.id
     WHERE m.id = $1 AND m.user_id = (SELECT id FROM users WHERE clerk_id = $2)`,
    [meetingId, userId]
  )
  return rows[0] || null
}

async function getUserMeetings(userId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await pool.query(
    `SELECT m.id, m.platform, m.title, m.status, m.started_at, m.ended_at,
            m.duration_mins, m.attendees, m.created_at,
            mo.summary
     FROM meetings m
     LEFT JOIN meeting_outputs mo ON mo.meeting_id = m.id
     WHERE m.user_id = (SELECT id FROM users WHERE clerk_id = $1)
     ORDER BY m.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  )
  return rows
}

// ─── Meeting Outputs ─────────────────────────────────────────────────────────

async function saveMeetingOutput(meetingId, output) {
  const { rows } = await pool.query(
    `INSERT INTO meeting_outputs (meeting_id, transcript, summary, key_decisions, action_items,
       unresolved_items, follow_up_email, jira_tickets, next_agenda, slack_summary)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      meetingId,
      output.transcript || null,
      output.summary,
      output.keyDecisions,
      JSON.stringify(output.actionItems),
      output.unresolvedItems,
      JSON.stringify(output.followUpEmail),
      JSON.stringify(output.jiraTickets),
      output.nextMeetingAgenda,
      output.slackSummary
    ]
  )
  return rows[0]
}

// ─── Usage ───────────────────────────────────────────────────────────────────

async function recordUsage(userId, meetingId, minutes) {
  const costPerMinute = 0.33 / 29 // ~$0.011 per minute
  const costUsd = (minutes * costPerMinute).toFixed(4)

  await pool.query(
    'INSERT INTO usage_events (user_id, meeting_id, minutes, cost_usd) VALUES ($1, $2, $3, $4)',
    [userId, meetingId, minutes, costUsd]
  )

  await pool.query(
    'UPDATE users SET minutes_used = minutes_used + $1 WHERE id = $2',
    [minutes, userId]
  )
}

// ─── Integrations ────────────────────────────────────────────────────────────

async function saveIntegration(userId, service, credentials, config = {}) {
  const { rows } = await pool.query(
    `INSERT INTO user_integrations (user_id, service, credentials, config)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, service) DO UPDATE SET credentials = $3, config = $4, is_active = true
     RETURNING *`,
    [userId, service, JSON.stringify(credentials), JSON.stringify(config)]
  )
  return rows[0]
}

async function removeIntegration(userId, service) {
  await pool.query(
    'UPDATE user_integrations SET is_active = false WHERE user_id = $1 AND service = $2',
    [userId, service]
  )
}

module.exports = {
  pool,
  getUserById,
  getUserByClerkId,
  createUser,
  updateUserPlan,
  getUserWithIntegrations,
  notifyUserPaymentFailed,
  createMeeting,
  updateMeetingStatus,
  getMeetingWithConfig,
  getMeetingWithOutput,
  getUserMeetings,
  saveMeetingOutput,
  recordUsage,
  saveIntegration,
  removeIntegration,
}
