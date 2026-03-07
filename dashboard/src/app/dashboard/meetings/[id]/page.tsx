'use client'

import { useState, useEffect, use } from 'react'
import { getMeeting } from '@/lib/api'
import { Navbar } from '@/components/Navbar'
import Link from 'next/link'

interface MeetingDetail {
  id: string
  platform: string
  title: string
  status: string
  started_at: string | null
  ended_at: string | null
  duration_mins: number | null
  attendees: string[]
  summary: string | null
  key_decisions: string[] | null
  action_items: Array<{ task: string; owner: string | null; deadline: string | null; priority: string }> | null
  unresolved_items: string[] | null
  follow_up_email: { subject: string; body: string } | null
  next_agenda: string[] | null
  transcript: string | null
}

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('summary')

  useEffect(() => {
    getMeeting(id)
      .then(setMeeting)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  if (!meeting) return <div style={{ padding: 40, textAlign: 'center' }}>Meeting not found</div>

  const tabs = ['summary', 'action-items', 'decisions', 'email', 'agenda', 'transcript']

  return (
    <div>
      <Navbar userName="" />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        <Link href="/dashboard" style={{ color: '#666', textDecoration: 'none' }}>
          &larr; Back to Dashboard
        </Link>

        <h1 style={{ marginTop: 16 }}>{meeting.title || 'Untitled Meeting'}</h1>
        <div style={{ color: '#666', marginBottom: 24 }}>
          {meeting.platform.toUpperCase()} &middot; {meeting.status} &middot;
          {meeting.duration_mins ? ` ${meeting.duration_mins} min` : ' Duration unknown'}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer',
                backgroundColor: activeTab === tab ? '#000' : '#e0e0e0',
                color: activeTab === tab ? '#fff' : '#333',
                fontSize: 14
              }}
            >
              {tab.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, minHeight: 200 }}>
          {activeTab === 'summary' && (
            <div>
              <h3>Summary</h3>
              <p>{meeting.summary || 'No summary available yet.'}</p>
            </div>
          )}

          {activeTab === 'action-items' && (
            <div>
              <h3>Action Items</h3>
              {meeting.action_items && meeting.action_items.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {meeting.action_items.map((item, i) => (
                    <li key={i} style={{ padding: '12px 0', borderBottom: '1px solid #eee' }}>
                      <strong>{item.task}</strong>
                      <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>
                        {item.owner && <span>Owner: {item.owner}</span>}
                        {item.deadline && <span> &middot; Due: {item.deadline}</span>}
                        <span> &middot; Priority: {item.priority}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No action items recorded.</p>
              )}
            </div>
          )}

          {activeTab === 'decisions' && (
            <div>
              <h3>Key Decisions</h3>
              {meeting.key_decisions && meeting.key_decisions.length > 0 ? (
                <ul>
                  {meeting.key_decisions.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              ) : (
                <p>No decisions recorded.</p>
              )}
              {meeting.unresolved_items && meeting.unresolved_items.length > 0 && (
                <>
                  <h3 style={{ marginTop: 24 }}>Unresolved Items</h3>
                  <ul>
                    {meeting.unresolved_items.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </>
              )}
            </div>
          )}

          {activeTab === 'email' && (
            <div>
              <h3>Follow-up Email</h3>
              {meeting.follow_up_email ? (
                <div>
                  <p><strong>Subject:</strong> {meeting.follow_up_email.subject}</p>
                  <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f5f5f5', padding: 16, borderRadius: 8 }}>
                    {meeting.follow_up_email.body}
                  </pre>
                </div>
              ) : (
                <p>No follow-up email generated.</p>
              )}
            </div>
          )}

          {activeTab === 'agenda' && (
            <div>
              <h3>Next Meeting Agenda</h3>
              {meeting.next_agenda && meeting.next_agenda.length > 0 ? (
                <ol>
                  {meeting.next_agenda.map((item, i) => <li key={i} style={{ padding: '4px 0' }}>{item}</li>)}
                </ol>
              ) : (
                <p>No agenda generated.</p>
              )}
            </div>
          )}

          {activeTab === 'transcript' && (
            <div>
              <h3>Transcript</h3>
              {meeting.transcript ? (
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6, maxHeight: 500, overflow: 'auto' }}>
                  {meeting.transcript}
                </pre>
              ) : (
                <p>No transcript available.</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
