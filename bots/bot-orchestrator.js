const { createRecallBot, speakInMeeting } = require('./recall-bot')
const { MeetingState } = require('./shared/meeting-state')
const { AgentBrain } = require('./shared/agent-brain')
const { generateSpeech } = require('./shared/tts-engine')
const db = require('../db')

// meetingId → { state, brain, recallBotId, checkInterval }
const activeMeetings = new Map()

async function launchMeetBot(meeting) {
  await db.updateMeetingStatus(meeting.id, 'active')

  try {
    const recallBot = await createRecallBot(meeting.meeting_url, meeting.id)

    const state = new MeetingState(meeting.id)
    const brain = new AgentBrain(state)

    // Background agent check every 5s — evaluates silence + transcript context
    const checkInterval = setInterval(async () => {
      const context = activeMeetings.get(meeting.id)
      if (!context) { clearInterval(checkInterval); return }
      if (!context.state.shouldRunAgentCheck()) return

      try {
        const decision = await context.brain.evaluate()
        if (decision.shouldSpeak && context.recallBotId) {
          console.log(`[Aria] Speaking: "${decision.message}"`)
          const { b64Data } = await generateSpeech(decision.message)
          await speakInMeeting(context.recallBotId, b64Data)
          await context.state.logAgentSpeech(decision.message)
        } else {
          console.log(`[Aria] Silent — reason: ${decision.reason}`)
        }
      } catch (err) {
        console.error('[Aria] Agent check error:', err.message)
      }
    }, 2000)

    activeMeetings.set(meeting.id, {
      state,
      brain,
      recallBotId: recallBot.id,
      checkInterval
    })

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
  const context = activeMeetings.get(meetingId)
  if (context?.checkInterval) clearInterval(context.checkInterval)
  activeMeetings.delete(meetingId)
}

function getActiveMeetings() {
  return Array.from(activeMeetings.keys())
}

module.exports = { launchMeetBot, getMeetingContext, removeMeeting, getActiveMeetings }
