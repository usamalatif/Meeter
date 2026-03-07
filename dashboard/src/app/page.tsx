import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 48, marginBottom: 16 }}>Aria</h1>
      <p style={{ fontSize: 20, color: '#666', marginBottom: 40 }}>
        AI Meeting Agent for Zoom &amp; Google Meet
      </p>

      <SignedOut>
        <p style={{ marginBottom: 24 }}>
          Aria joins your meetings, takes notes, asks clarifying questions, and sends follow-up emails with action items.
        </p>
        <SignInButton mode="modal">
          <button style={{
            padding: '12px 32px', fontSize: 16, backgroundColor: '#000',
            color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer'
          }}>
            Get Started
          </button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{
            padding: '12px 32px', fontSize: 16, backgroundColor: '#000',
            color: '#fff', borderRadius: 8, textDecoration: 'none'
          }}>
            Go to Dashboard
          </Link>
        </div>
      </SignedIn>
    </main>
  )
}
