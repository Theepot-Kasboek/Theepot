import Topbar from '@/components/Topbar'
import PaginaPlaceholder from '@/components/PaginaPlaceholder'
import { MessageSquare } from 'lucide-react'

export default function ChatPage() {
  return (
    <>
      <Topbar
        titel="Chat"
        subtitel="Intern berichtenverkeer"
      />
      <div className="page-content">
        <PaginaPlaceholder
          icon={<MessageSquare size={28} />}
          titel="Chat"
          beschrijving="Intern berichtenverkeer tussen medewerkers. Directe berichten en groepsgesprekken. Wordt binnenkort gebouwd."
        />
      </div>
    </>
  )
}
