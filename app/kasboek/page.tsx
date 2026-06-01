import Topbar from '@/components/Topbar'
import PaginaPlaceholder from '@/components/PaginaPlaceholder'
import { Wallet } from 'lucide-react'

export default function KasboekPage() {
  return (
    <>
      <Topbar
        titel="Kasboek"
        subtitel="Financieel overzicht per maand"
      />
      <div className="page-content">
        <PaginaPlaceholder
          icon={<Wallet size={28} />}
          titel="Kasboek"
          beschrijving="Inkomsten en uitgaven per periode bijhouden, bonnetjes uploaden en maandelijkse overzichten bekijken. Wordt binnenkort gebouwd."
        />
      </div>
    </>
  )
}
