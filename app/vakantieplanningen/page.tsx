import Topbar from '@/components/Topbar'
import PaginaPlaceholder from '@/components/PaginaPlaceholder'
import { Map } from 'lucide-react'

export default function VakantieplanningenPage() {
  return (
    <>
      <Topbar
        titel="Vakantieplanningen"
        subtitel="Activiteitenplanning per vakantieperiode"
      />
      <div className="page-content">
        <PaginaPlaceholder
          icon={<Map size={28} />}
          titel="Vakantieplanningen"
          beschrijving="Plan activiteiten per vakantieweek. Koppel weken, thema's en activiteiten uit de bibliotheek aan een vakantieprogramma. Wordt binnenkort gebouwd."
        />
      </div>
    </>
  )
}
