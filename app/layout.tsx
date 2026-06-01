import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import LayoutShell from '@/components/LayoutShell'

export const metadata: Metadata = {
  title: 'De Molen — BSO Beheer',
  description: 'Intern beheerprogramma voor BSO De Molen',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <AuthProvider>
          <LayoutShell>{children}</LayoutShell>
        </AuthProvider>
      </body>
    </html>
  )
}
