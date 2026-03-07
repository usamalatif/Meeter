const { createRecallBot } = require('./recall-bot')
const { MeetingState } = require('./shared/meeting-state')
const { AgentBrain } = require('./shared/agent-brain')
const db = require('../db')

// meetingId → { state, brain, recallBotId }
const activeMeetings = new Map()
// recallBotId → meetingId (reverse lookup for transcript webhooks)
const botIdToMeetingId = new Map()

async function launchMeetBot(meeting) {
  await db.updateMeetingStatus(meeting.id, 'active')

  try {
    const recallBot = await createRecallBot(meeting.meeting_url, meeting.id)

    const state = new MeetingState(meeting.id)
    const brain = new AgentBrain(state)

    activeMeetings.set(meeting.id, {
      state,
      brain,
      recallBotId: recallBot.id
    })
    botIdToMeetingId.set(recallBot.id, meeting.id)

    console.log(`[Orchestrator] Recall bot ${recallBot.id} launched for meeting ${meeting.id}`)
    return recallBot
  } catch (err) {
    const recallError = err.response?.data
    console.error(`[Orchestrator] Bot launch failed for ${meeting.id}:`, err.message)
    if (recallError) console.error(`[Recall API Error]:`, JSON.stringify(recallError))
    await db.updateMeetingStatus(meeting.id, 'failed')
    throw err
  }
}

function getMeetingContext(meetingId) {
  return activeMeetings.get(meetingId) || null
}

function removeMeeting(meetingId) {
  const ctx = activeMeetings.get(meetingId)
  if (ctx) botIdToMeetingId.delete(ctx.recallBotId)
  activeMeetings.delete(meetingId)
}

function getMeetingContextByBotId(recallBotId) {
  const meetingId = botIdToMeetingId.get(recallBotId)
  return meetingId ? activeMeetings.get(meetingId) || null : null
}

function getActiveMeetings() {
  return Array.from(activeMeetings.keys())
}

module.exports = { launchMeetBot, getMeetingContext, getMeetingContextByBotId, removeMeeting, getActiveMeetings }
