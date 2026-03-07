const axios = require('axios')

async function createJiraTickets({ tickets, projectKey, credentials }) {
  const { domain, email, apiToken } = credentials
  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64')
  const created = []

  for (const ticket of tickets) {
    const res = await axios.post(
      `https://${domain}.atlassian.net/rest/api/3/issue`,
      {
        fields: {
          project: { key: projectKey },
          summary: ticket.title,
          description: {
            type: 'doc', version: 1,
            content: [{ type: 'paragraph', content: [{ type: 'text', text: ticket.description }] }]
          },
          issuetype: { name: 'Task' },
          priority: { name: ticket.priority },
          labels: ticket.labels || []
        }
      },
      { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' } }
    )
    created.push(res.data.key)
    console.log(`[Jira] Created: ${res.data.key}`)
  }

  return created
}

module.exports = { createJiraTickets }
