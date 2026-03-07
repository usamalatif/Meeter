const { createRecallBot } = require('./recall-bot')
const { MeetingState } = require('./shared/meeting-state')
const { AgentBrain } = require('./shared/agent-brain')
const db = require('../db')

// meetingId → { state, brain, recallBotId }
const activeMeetings = new Map()

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

    console.log(`[Orchestrator] Recall bot ${recallBot.id} launched for meeting ${meeting.id}`)
    return recallBot
  } catch (err) {
    console.error(`[Orchestrator] Bot launch failed for ${meeting.id}:`, err.message)
    await db.updateMeetingStatus(meeting.id, 'failed')
    throw err
  }
}

function getMeetingContext(meetingId) {
  return activeMeetings.get(meetingId) || null
}

function removeMeeting(meetingId) {
  activeMeetings.delete(meetingId)
}

function getActiveMeetings() {
  return Array.from(activeMeetings.keys())
}

module.exports = { launchMeetBot, getMeetingContext, removeMeeting, getActiveMeetings }
