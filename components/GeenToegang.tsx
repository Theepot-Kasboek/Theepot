'use client'

import { Lock } from 'lucide-react'
import Topbar from './Topbar'

/**
 * Standaard weergave wanneer een gebruiker geen toegang heeft tot een pagina.
 * Gebruik dit direct in de `return` van een pagina, vóór de echte inhoud wordt
 * opgebouwd, zodat er ook geen data geladen of getoond wordt.
 */
export default function GeenToegang({
  titel,
  beschrijving = 'Je hebt geen toegang tot deze pagina. Neem contact op met een beheerder als dit niet klopt.',
  icon,
}: {
  titel: string
  beschrijving?: string
  icon?: React.ReactNode
}) {
  return (
    <>
      <Topbar titel={titel} subtitel="Geen toegang" />
      <div className="page-content">
        <div className="empty-state">
          {icon ?? <Lock size={36} />}
          <h3>Geen toegang</h3>
          <p>{beschrijving}</p>
        </div>
      </div>
    </>
  )
}
