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
  slack_summary: string | null
  transcript: string | null
}

const priorityColors: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#22c55e'
}

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('summary')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getMeeting(id)
      .then(data => { setMeeting(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  // Auto-refresh while meeting is still active
  useEffect(() => {
    if (!meeting || meeting.status === 'completed' || meeting.status === 'failed') return
    const interval = setInterval(() => {
      getMeeting(id).then(setMeeting).catch(() => {})
    }, 8000)
    return () => clearInterval(interval)
  }, [id, meeting?.status])

  function copyEmail() {
    if (!meeting?.follow_up_email) return
    const text = `Subject: ${meeting.follow_up_email.subject}\n\n${meeting.follow_up_email.body}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  if (!meeting) return <div style={{ padding: 40, textAlign: 'center' }}>Meeting not found</div>

  const tabs = ['summary', 'action-items', 'decisions', 'email', 'agenda', 'slack', 'transcript']

  return (
    <div>
      <Navbar userName="" />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        <Link href="/dashboard" style={{ color: '#666', textDecoration: 'none' }}>
          &larr; Back to Dashboard
        </Link>

        <h1 style={{ marginTop: 16 }}>{meeting.title || 'Untitled Meeting'}</h1>
        <div style={{ color: '#666', marginBottom: 8 }}>
          {meeting.platform.toUpperCase()} &middot; {meeting.status}
          {meeting.duration_mins ? ` · ${meeting.duration_mins} min` : ''}
          {meeting.started_at ? ` · ${new Date(meeting.started_at).toLocaleString()}` : ''}
        </div>

        {meeting.attendees?.length > 0 && (
          <div style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {meeting.attendees.map((a, i) => (
              <span key={i} style={{
                padding: '3px 10px', backgroundColor: '#f0f0f0', borderRadius: 20, fontSize: 13
              }}>{a}</span>
            ))}
          </div>
        )}

        {(meeting.status === 'active' || meeting.status === 'scheduled') && (
          <div style={{
            padding: '10px 16px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d',
            borderRadius: 8, marginBottom: 20, fontSize: 14, color: '#92400e'
          }}>
            Aria is in the meeting — this page refreshes automatically.
          </div>
        )}

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
              <h3 style={{ marginTop: 0 }}>Summary</h3>
              <p style={{ lineHeight: 1.7 }}>{meeting.summary || 'No summary available yet.'}</p>
            </div>
          )}

          {activeTab === 'action-items' && (
            <div>
              <h3 style={{ marginTop: 0 }}>Action Items</h3>
              {meeting.action_items && meeting.action_items.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {meeting.action_items.map((item, i) => (
                    <li key={i} style={{ padding: '14px 0', borderBottom: '1px solid #eee' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <strong style={{ fontSize: 15 }}>{item.task}</strong>
                        <span style={{
                          padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          backgroundColor: priorityColors[item.priority?.toLowerCase()] || '#999',
                          color: '#fff', whiteSpace: 'nowrap', flexShrink: 0
                        }}>{item.priority}</span>
                      </div>
                      <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
                        {item.owner && <span>Owner: {item.owner}</span>}
                        {item.owner && item.deadline && <span> &middot; </span>}
                        {item.deadline && <span>Due: {item.deadline}</span>}
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
              <h3 style={{ marginTop: 0 }}>Key Decisions</h3>
              {meeting.key_decisions && meeting.key_decisions.length > 0 ? (
                <ul style={{ lineHeight: 1.8 }}>
                  {meeting.key_decisions.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              ) : (
                <p>No decisions recorded.</p>
              )}
              {meeting.unresolved_items && meeting.unresolved_items.length > 0 && (
                <>
                  <h3 style={{ marginTop: 28 }}>Unresolved Items</h3>
                  <ul style={{ lineHeight: 1.8 }}>
                    {meeting.unresolved_items.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </>
              )}
            </div>
          )}

          {activeTab === 'email' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Follow-up Email</h3>
                {meeting.follow_up_email && (
                  <button
                    onClick={copyEmail}
                    style={{
                      padding: '6px 14px', border: '1px solid #ddd', borderRadius: 6,
                      cursor: 'pointer', fontSize: 13, backgroundColor: copied ? '#f0fdf4' : '#fff',
                      color: copied ? '#16a34a' : '#333'
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>
              {meeting.follow_up_email ? (
                <div>
                  <p style={{ marginBottom: 12 }}><strong>Subject:</strong> {meeting.follow_up_email.subject}</p>
                  <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f5f5f5', padding: 16, borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
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
              <h3 style={{ marginTop: 0 }}>Next Meeting Agenda</h3>
              {meeting.next_agenda && meeting.next_agenda.length > 0 ? (
                <ol style={{ lineHeight: 1.8 }}>
                  {meeting.next_agenda.map((item, i) => <li key={i} style={{ padding: '4px 0' }}>{item}</li>)}
                </ol>
              ) : (
                <p>No agenda generated.</p>
              )}
            </div>
          )}

          {activeTab === 'slack' && (
            <div>
              <h3 style={{ marginTop: 0 }}>Slack Summary</h3>
              {meeting.slack_summary ? (
                <div style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 8, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {meeting.slack_summary}
                </div>
              ) : (
                <p>No Slack summary generated.</p>
              )}
            </div>
          )}

          {activeTab === 'transcript' && (
            <div>
              <h3 style={{ marginTop: 0 }}>Transcript</h3>
              {meeting.transcript ? (
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, maxHeight: 600, overflow: 'auto' }}>
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
