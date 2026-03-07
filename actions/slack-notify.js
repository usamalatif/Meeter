const { WebClient } = require('@slack/web-api')

async function postToSlack({ channelId, message, actionItems, credentials }) {
  const slack = new WebClient(credentials.accessToken)

  const actionBlock = actionItems.map(a =>
    `• ${a.task}${a.owner ? ` — *${a.owner}*` : ''}${a.deadline ? ` (due ${a.deadline})` : ''}`
  ).join('\n')

  await slack.chat.postMessage({
    channel: channelId,
    text: message,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `*Meeting Summary*\n${message}` } },
      ...(actionItems.length > 0 ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: `*Action Items:*\n${actionBlock}` }
      }] : [])
    ]
  })

  console.log(`[Slack] Posted to channel: ${channelId}`)
}

module.exports = { postToSlack }
