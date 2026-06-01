'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

const GEEN_SIDEBAR = ['/login']

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showSidebar = !GEEN_SIDEBAR.includes(pathname)

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">{children}</div>
    </div>
  )
}
