import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aria - AI Meeting Agent',
  description: 'AI-powered meeting assistant for Zoom and Google Meet',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f5f5f5' }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
