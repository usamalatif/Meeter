'use client'

import { useState } from 'react'

interface ScheduleFormProps {
  onSchedule: (meetingUrl: string, title: string) => Promise<void>
  loading: boolean
}

export function ScheduleForm({ onSchedule, loading }: ScheduleFormProps) {
  const [meetingUrl, setMeetingUrl] = useState('')
  const [title, setTitle] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!meetingUrl.trim()) return
    await onSchedule(meetingUrl.trim(), title.trim())
    setMeetingUrl('')
    setTitle('')
  }

  const isValidUrl = meetingUrl.includes('zoom.us') || meetingUrl.includes('meet.google.com')

  return (
    <form onSubmit={handleSubmit} style={{
      backgroundColor: '#fff', borderRadius: 12, padding: 24,
      display: 'flex', flexDirection: 'column', gap: 16
    }}>
      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Meeting URL</label>
        <input
          type="url"
          value={meetingUrl}
          onChange={e => setMeetingUrl(e.target.value)}
          placeholder="https://zoom.us/j/123456789 or https://meet.google.com/abc-defg-hij"
          required
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 8,
            border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box'
          }}
        />
        {meetingUrl && !isValidUrl && (
          <p style={{ color: '#c00', fontSize: 13, marginTop: 4 }}>
            Please enter a Zoom or Google Meet URL
          </p>
        )}
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Meeting Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g., Weekly Standup"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 8,
            border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box'
          }}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !isValidUrl}
        style={{
          padding: '12px 24px', backgroundColor: loading || !isValidUrl ? '#ccc' : '#000',
          color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'wait' : 'pointer',
          fontSize: 15, fontWeight: 500, alignSelf: 'flex-start'
        }}
      >
        {loading ? 'Sending bot...' : 'Send Aria to Meeting'}
      </button>
    </form>
  )
}
