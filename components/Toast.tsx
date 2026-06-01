'use client'

import { useEffect } from 'react'

interface ToastProps {
  bericht: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
  duur?: number
}

export default function Toast({ bericht, type = 'info', onClose, duur = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duur)
    return () => clearTimeout(timer)
  }, [onClose, duur])

  return (
    <div className={`toast ${type}`} onClick={onClose} style={{ cursor: 'pointer' }}>
      {bericht}
    </div>
  )
}
