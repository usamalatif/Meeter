const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type ClerkWindow = Window & {
  Clerk?: { session?: { getToken: () => Promise<string | null> }; load?: () => Promise<void> }
}

async function getClerkToken(): Promise<string | null> {
  const clerk = (window as ClerkWindow).Clerk
  if (!clerk) return null
  // Wait for Clerk to finish loading if it hasn't yet
  if (!clerk.session && clerk.load) await clerk.load()
  return clerk.session?.getToken() ?? null
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getClerkToken()

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${res.status}`)
  }

  return res.json()
}

export async function getUser() {
  return apiFetch('/api/users/me')
}

export async function getMeetings(offset = 0) {
  return apiFetch(`/api/meetings?offset=${offset}`)
}

export async function getMeeting(id: string) {
  return apiFetch(`/api/meetings/${id}`)
}

export async function scheduleMeeting(data: {
  meetingUrl: string
  title?: string
  attendees?: string[]
  config?: Record<string, unknown>
}) {
  return apiFetch('/api/meetings/schedule', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function saveIntegration(service: string, credentials: Record<string, unknown>, config?: Record<string, unknown>) {
  return apiFetch('/api/users/integrations', {
    method: 'POST',
    body: JSON.stringify({ service, credentials, config }),
  })
}

export async function removeIntegration(service: string) {
  return apiFetch(`/api/users/integrations/${service}`, {
    method: 'DELETE',
  })
}
