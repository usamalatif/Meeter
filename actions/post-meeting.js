const { AgentBrain } = require('../bots/shared/agent-brain')
const { sendFollowUpEmail } = require('./email-sender')
const { createJiraTickets } = require('./jira-tickets')
const { postToSlack } = require('./slack-notify')
const db = require('../db')

async function runPostMeetingPipeline(meetingId, fullTranscript) {
  console.log(`[PostMeeting] Starting pipeline for: ${meetingId}`)

  const meeting = await db.getMeetingWithConfig(meetingId)
  const user = await db.getUserWithIntegrations(meeting.user_id)

  // ONE Claude call — returns everything structured
  const brain = new AgentBrain(null)
  const output = await brain.generatePostMeetingOutput(fullTranscript, {
    meetingTitle: meeting.title,
    attendees: meeting.attendees,
    previousContext: meeting.previousMeetingContext
  })

  // Kick off all actions in parallel
  const tasks = [
    db.saveMeetingOutput(meetingId, { ...output, transcript: fullTranscript || null })
  ]

  if (user.integrations.gmail && meeting.config.sendEmail !== false) {
    tasks.push(sendFollowUpEmail({
      to: meeting.attendees,
      subject: output.followUpEmail.subject,
      body: output.followUpEmail.body,
      credentials: user.integrations.gmail
    }))
  }

  if (user.integrations.jira && output.jiraTickets.length > 0) {
    tasks.push(createJiraTickets({
      tickets: output.jiraTickets,
      projectKey: meeting.config.jiraProjectKey,
      credentials: user.integrations.jira
    }))
  }

  if (user.integrations.slack && meeting.config.slackChannelId) {
    tasks.push(postToSlack({
      channelId: meeting.config.slackChannelId,
      message: output.slackSummary,
      actionItems: output.actionItems,
      credentials: user.integrations.slack
    }))
  }

  const results = await Promise.allSettled(tasks)
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`[PostMeeting] Task ${i} failed:`, r.reason)
  })

  // Update meeting status
  await db.updateMeetingStatus(meetingId, 'completed')

  console.log('[PostMeeting] Pipeline complete')
  return output
}

module.exports = { runPostMeetingPipeline }
