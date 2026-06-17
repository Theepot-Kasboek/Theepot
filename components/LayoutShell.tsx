'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import SpeedDial from './SpeedDial'

const GEEN_SIDEBAR = ['/login']

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showSidebar = !GEEN_SIDEBAR.includes(pathname)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Sluit sidebar bij navigatie
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <div className="app-layout">
      {/* Overlay voor mobiel */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar met open/dicht state */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-area">
        {/* Geef toggle door via context aan children */}
        <MobielContext.Provider value={{ toggleSidebar: () => setSidebarOpen(o => !o) }}>
          {children}
          <SpeedDial />
        </MobielContext.Provider>
      </div>
    </div>
  )
}

// Context voor hamburger knop in Topbar
import { createContext, useContext } from 'react'

interface MobielContextType {
  toggleSidebar: () => void
}

export const MobielContext = createContext<MobielContextType>({ toggleSidebar: () => {} })
export const useMobiel = () => useContext(MobielContext)
