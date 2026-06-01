import Topbar from '@/components/Topbar'
import PaginaPlaceholder from '@/components/PaginaPlaceholder'
import { BookOpen } from 'lucide-react'

export default function ActiviteitenPage() {
  return (
    <>
      <Topbar
        titel="Activiteitenbeheer"
        subtitel="Bibliotheek met BSO-activiteiten"
      />
      <div className="page-content">
        <PaginaPlaceholder
          icon={<BookOpen size={28} />}
          titel="Activiteitenbeheer"
          beschrijving="Zoek, filter en beheer alle BSO-activiteiten. Exporteer als PDF of kopieer naar klembord. Activiteiten importeren via JSON of PDF. Wordt binnenkort gebouwd."
        />
      </div>
    </>
  )
}
