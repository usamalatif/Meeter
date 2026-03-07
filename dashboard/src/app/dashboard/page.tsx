'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { getMeetings, scheduleMeeting } from '@/lib/api'
import { MeetingList } from '@/components/MeetingList'
import { ScheduleForm } from '@/components/ScheduleForm'
import { Navbar } from '@/components/Navbar'

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

export default function DashboardPage() {
  const { user } = useUser()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [scheduling, setScheduling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMeetings()
  }, [])

  async function loadMeetings() {
    try {
      const data = await getMeetings()
      setMeetings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meetings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSchedule(meetingUrl: string, title: string) {
    setScheduling(true)
    setError(null)
    try {
      await scheduleMeeting({ meetingUrl, title })
      await loadMeetings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule')
    } finally {
      setScheduling(false)
    }
  }

  return (
    <div>
      <Navbar userName={user?.firstName || 'User'} />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        <h2 style={{ marginBottom: 24 }}>Schedule a Meeting</h2>
        <ScheduleForm onSchedule={handleSchedule} loading={scheduling} />

        {error && (
          <div style={{ padding: 12, backgroundColor: '#fee', color: '#c00', borderRadius: 8, marginTop: 16 }}>
            {error}
          </div>
        )}

        <h2 style={{ marginTop: 40, marginBottom: 16 }}>Your Meetings</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <MeetingList meetings={meetings} />
        )}
      </main>
    </div>
  )
}
