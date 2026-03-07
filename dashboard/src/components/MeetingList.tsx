'use client'

import Link from 'next/link'

interface Meeting {
  id: string
  platform: string
  title: string
  status: string
  started_at: string | null
  ended_at: string | null
  duration_mins: number | null
  attendees: string[]
  created_at: string
  summary: string | null
}

const statusColors: Record<string, string> = {
  scheduled: '#f59e0b',
  active: '#22c55e',
  completed: '#3b82f6',
  failed: '#ef4444',
}

export function MeetingList({ meetings }: { meetings: Meeting[] }) {
  if (meetings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
        <p>No meetings yet. Paste a Zoom or Google Meet link above to get started.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {meetings.map(meeting => (
        <Link
          key={meeting.id}
          href={`/dashboard/meetings/${meeting.id}`}
          style={{
            display: 'block', backgroundColor: '#fff', borderRadius: 12,
            padding: 20, textDecoration: 'none', color: 'inherit',
            border: '1px solid #eee', transition: 'box-shadow 0.2s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>{meeting.title || 'Untitled Meeting'}</h3>
              <p style={{ margin: '6px 0 0', color: '#666', fontSize: 13 }}>
                {meeting.platform.toUpperCase()}
                {meeting.duration_mins && ` · ${meeting.duration_mins} min`}
                {' · '}{new Date(meeting.created_at).toLocaleDateString()}
              </p>
              {meeting.summary && (
                <p style={{ margin: '8px 0 0', color: '#444', fontSize: 14, lineHeight: 1.4 }}>
                  {meeting.summary.slice(0, 150)}{meeting.summary.length > 150 ? '...' : ''}
                </p>
              )}
            </div>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              backgroundColor: statusColors[meeting.status] || '#999', color: '#fff',
              textTransform: 'capitalize', whiteSpace: 'nowrap'
            }}>
              {meeting.status}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
