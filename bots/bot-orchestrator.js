const { launchZoomBot } = require('./zoom/zoom-launcher')
const db = require('../db')

const activeBots = new Map() // meetingId → bot process/instance

async function launchMeetBot(meeting) {
  await db.updateMeetingStatus(meeting.id, 'active')

  try {
    if (meeting.platform === 'zoom') {
      const { meetingNumber, passcode } = parseZoomUrl(meeting.meetingUrl)
      const botProcess = await launchZoomBot(meetingNumber, passcode, meeting.id)
      activeBots.set(meeting.id, botProcess)

      botProcess.on('exit', () => {
        activeBots.delete(meeting.id)
      })

    } else if (meeting.platform === 'meet') {
      const { spawn } = require('child_process')
      const user = await db.getUserById(meeting.userId)

      const botProcess = spawn('python3', [
        './bots/meet/meet-bot.py',
        '--meeting-uri', meeting.meetingUrl,
        '--meeting-id', meeting.id,
        '--user-email', user.email
      ], {
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe']
      })

      activeBots.set(meeting.id, botProcess)

      botProcess.stdout.on('data', d => console.log('[MeetBot]', d.toString()))
      botProcess.stderr.on('data', d => console.error('[MeetBot:err]', d.toString()))
      botProcess.on('exit', () => {
        activeBots.delete(meeting.id)
      })
    }

    await db.updateMeetingStatus(meeting.id, 'completed')
  } catch (err) {
    console.error(`[Orchestrator] Bot launch failed for ${meeting.id}:`, err)
    await db.updateMeetingStatus(meeting.id, 'failed')
  }
}

function parseZoomUrl(url) {
  const meetingMatch = url.match(/\/j\/(\d+)/)
  const passcodeMatch = url.match(/pwd=([^&]+)/)
  return {
    meetingNumber: meetingMatch?.[1],
    passcode: passcodeMatch?.[1] || ''
  }
}

function getActiveBots() {
  return Array.from(activeBots.keys())
}

module.exports = { launchMeetBot, getActiveBots }
