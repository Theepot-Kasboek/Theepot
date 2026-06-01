import Topbar from '@/components/Topbar'
import PaginaPlaceholder from '@/components/PaginaPlaceholder'
import { ShieldCheck } from 'lucide-react'

export default function RechtenPage() {
  return (
    <>
      <Topbar
        titel="Rechtenbeheer"
        subtitel="Gebruikers & toegang per pagina"
      />
      <div className="page-content">
        <PaginaPlaceholder
          icon={<ShieldCheck size={28} />}
          titel="Rechtenbeheer"
          beschrijving="Beheer welke medewerker welke pagina en functie kan zien en gebruiken. Rollen instellen per gebruiker: superadmin, beheerder of medewerker. Wordt binnenkort gebouwd."
        />
      </div>
    </>
  )
}
