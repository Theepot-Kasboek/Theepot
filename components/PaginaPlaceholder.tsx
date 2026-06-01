import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface PaginaPlaceholderProps {
  icon: React.ReactNode
  titel: string
  beschrijving: string
}

export default function PaginaPlaceholder({ icon, titel, beschrijving }: PaginaPlaceholderProps) {
  return (
    <div className="empty-state" style={{ height: '100%' }}>
      <div
        style={{
          width: 64,
          height: 64,
          background: 'var(--primary-light)',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--primary)',
          marginBottom: 8,
        }}
      >
        {icon}
      </div>
      <h3>{titel}</h3>
      <p>{beschrijving}</p>
      <Link href="/" className="btn" style={{ marginTop: 8 }}>
        <ArrowLeft size={14} />
        Terug naar dashboard
      </Link>
    </div>
  )
}
