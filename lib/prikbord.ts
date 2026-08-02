import { getSupabase } from './supabase'

/** Minimale velden die nodig zijn om te bepalen of een prikbordbericht zichtbaar is. */
export interface PrikbordZichtbaarheid {
  locatie_naam: string
  verloopdatum: string | null
}

/**
 * Locaties waarvan deze gebruiker prikbordberichten mag zien.
 * Wie alles mag zien (superadmin/directie/leidinggevende) krijgt alle actieve locaties.
 */
export async function haalPrikbordLocaties(profielId: string, magAllesZien: boolean): Promise<string[]> {
  const supabase = getSupabase()
  const { data: alle } = await supabase.from('kasboek_locaties').select('naam').eq('actief', true).order('naam')
  const alleNamen: string[] = (alle ?? []).map((l: { naam: string }) => l.naam)
  if (magAllesZien) return alleNamen

  const { data: toegang } = await supabase
    .from('locatie_toegang')
    .select('locatie_naam')
    .eq('profiel_id', profielId)
    .eq('locatie_type', 'prikbord')
    .neq('toegang', 'geen')
  const toegankelijk = (toegang ?? []).map((t: { locatie_naam: string }) => t.locatie_naam)
  return alleNamen.filter((n) => toegankelijk.includes(n))
}

/**
 * Een bericht telt alleen mee als het niet verlopen is én voor een zichtbare locatie is.
 * Wordt gebruikt door zowel de prikbordpagina als de ongelezen-teller in de sidebar,
 * zodat de badge nooit berichten telt die je niet te zien krijgt.
 */
export function isZichtbaarPrikbordBericht(
  bericht: PrikbordZichtbaarheid,
  opties: { magAllesZien: boolean; locaties: string[]; nu?: Date }
): boolean {
  const nu = opties.nu ?? new Date()
  if (bericht.verloopdatum && new Date(bericht.verloopdatum) < nu) return false
  if (opties.magAllesZien) return true
  return bericht.locatie_naam === 'alle' || opties.locaties.includes(bericht.locatie_naam)
}
