// Koppelt elk rechten-veld (pagina_x) aan de route waar dat recht op slaat.
// Moet in sync blijven met de vereistRecht/href-koppelingen in components/Sidebar.tsx.
export const PAGINA_ROUTES: { vereistRecht: string; href: string }[] = [
  { vereistRecht: 'pagina_prikbord', href: '/prikbord' },
  { vereistRecht: 'pagina_kasboek', href: '/kasboek' },
  { vereistRecht: 'pagina_maaltijdlijst', href: '/maaltijdlijst' },
  { vereistRecht: 'pagina_beleid', href: '/beleid' },
  { vereistRecht: 'pagina_brandoefening', href: '/brandoefening' },
  { vereistRecht: 'pagina_activiteiten_log', href: '/activiteiten-log' },
  { vereistRecht: 'pagina_gesprekken', href: '/gesprekken' },
  { vereistRecht: 'pagina_vakantieplanningen', href: '/vakantieplanningen' },
  { vereistRecht: 'pagina_weekplanningen', href: '/weekplanningen' },
  { vereistRecht: 'pagina_activiteiten', href: '/activiteiten' },
  { vereistRecht: 'pagina_ve_planning', href: '/ve-planning' },
  { vereistRecht: 'pagina_agenda', href: '/agenda' },
  { vereistRecht: 'pagina_chat', href: '/chat' },
  { vereistRecht: 'pagina_nieuwsbrieven', href: '/nieuwsbrieven' },
]

// Als een account (geen superadmin) toegang heeft tot precies één pagina, geeft dit
// de route van die pagina terug. Zo'n account krijgt dan alleen die ene pagina te zien:
// de sidebar toont niets anders en navigatie elders wordt teruggestuurd.
export function enkeleToegangHref(rechten: Record<string, string>, isSuperadmin: boolean): string | null {
  if (isSuperadmin) return null
  const toegankelijk = PAGINA_ROUTES.filter(
    (r) => rechten[r.vereistRecht] === 'lezen' || rechten[r.vereistRecht] === 'bewerken'
  )
  return toegankelijk.length === 1 ? toegankelijk[0].href : null
}
