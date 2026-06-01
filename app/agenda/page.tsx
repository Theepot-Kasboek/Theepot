import Topbar from '@/components/Topbar'
import PaginaPlaceholder from '@/components/PaginaPlaceholder'
import { Calendar } from 'lucide-react'

export default function AgendaPage() {
  return (
    <>
      <Topbar
        titel="Agenda"
        subtitel="Persoonlijk & algemeen"
      />
      <div className="page-content">
        <PaginaPlaceholder
          icon={<Calendar size={28} />}
          titel="Agenda"
          beschrijving="Persoonlijke en gedeelde agenda. Afspraken aanmaken, bekijken en delen met collega's. Persoonlijke agenda ook deelbaar via link. Wordt binnenkort gebouwd."
        />
      </div>
    </>
  )
}
