'use client'

import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export function Navbar({ userName }: { userName: string }) {
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 24px', backgroundColor: '#fff', borderBottom: '1px solid #e0e0e0'
    }}>
      <Link href="/dashboard" style={{ textDecoration: 'none', color: '#000', fontSize: 20, fontWeight: 700 }}>
        Aria
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {userName && <span style={{ color: '#666', fontSize: 14 }}>{userName}</span>}
        <UserButton afterSignOutUrl="/" />
      </div>
    </nav>
  )
}
