const { google } = require('googleapis')

async function sendFollowUpEmail({ to, subject, body, credentials }) {
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials(credentials) // user's stored OAuth tokens

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const recipients = Array.isArray(to) ? to : [to]

  const email = [
    `To: ${recipients.join(', ')}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body
  ].join('\n')

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: Buffer.from(email).toString('base64url') }
  })

  console.log(`[Email] Sent to ${recipients.length} recipients`)
}

module.exports = { sendFollowUpEmail }
