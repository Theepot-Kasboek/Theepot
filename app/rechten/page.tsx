import Topbar from '@/components/Topbar'
import PaginaPlaceholder from '@/components/PaginaPlaceholder'
import { ShieldCheck } from 'lucide-react'

export default function RechtenPage() {
  return (
    <>
      <Topbar titel="Rechtenbeheer" subtitel="Toegang per pagina en functie" />
      <div className="page-content">
        <PaginaPlaceholder
          icon={<ShieldCheck size={28} />}
          titel="Rechtenbeheer"
          beschrijving="Stel per rol in welke pagina's en functies zichtbaar en bruikbaar zijn. Rollen: Superadmin, Directie, Leidinggevende en Locatie. Wordt binnenkort gebouwd."
        />
      </div>
    </>
  )
}
