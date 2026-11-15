// Types en helpers voor de evenementen-module (aanmelden via publieke link).
// Zie supabase-sql/evenementen.sql voor het databasemodel.

import { getSupabase } from '@/lib/supabase'

export type EvenementStatus = 'actief' | 'geannuleerd'

export interface Evenement {
  id: string
  titel: string
  omschrijving: string | null
  locatie: string | null
  datum: string | null
  sluit_aanmelden_op: string
  max_aanmeldingen: number | null
  status: EvenementStatus
  aangemaakt_door: string | null
  aangemaakt_op: string
  bijgewerkt_op: string
}

export interface EvenementAanmelding {
  id: string
  evenement_id: string
  naam: string | null
  email: string
  aangemeld_op: string
}

export type EvenementVeldType = 'tekst' | 'keuze'

export interface EvenementVeld {
  id: string
  evenement_id: string
  label: string
  type: EvenementVeldType
  opties: string[] | null
  meerdere: boolean
  verplicht: boolean
  volgorde: number
  aangemaakt_op: string
}

// Eén opgeslagen antwoord-string voor een meerdere-keuze-veld bestaat uit de
// gekozen opties, gescheiden door ", ". Hiermee schakel je één optie aan/uit.
export function wisselMeerkeuzeOptie(huidig: string, optie: string): string {
  const items = huidig ? huidig.split(',').map(s => s.trim()).filter(Boolean) : []
  const idx = items.indexOf(optie)
  if (idx >= 0) items.splice(idx, 1)
  else items.push(optie)
  return items.join(', ')
}

export function meerkeuzeOpties(waarde: string): string[] {
  return waarde ? waarde.split(',').map(s => s.trim()).filter(Boolean) : []
}

export interface EvenementVeldAntwoord {
  id: string
  aanmelding_id: string
  veld_id: string
  waarde: string | null
}

export async function haalEvenementenOp(): Promise<Evenement[]> {
  const { data, error } = await getSupabase()
    .from('evenementen')
    .select('*')
    .order('sluit_aanmelden_op', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function maakEvenementAan(
  aangemaaktDoor: string,
  v: Pick<Evenement, 'titel' | 'sluit_aanmelden_op'> &
    Partial<Pick<Evenement, 'omschrijving' | 'locatie' | 'datum' | 'max_aanmeldingen'>>
): Promise<Evenement> {
  const { data, error } = await getSupabase()
    .from('evenementen')
    .insert([{ aangemaakt_door: aangemaaktDoor, ...v }])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function wijzigEvenement(
  id: string,
  w: Partial<Pick<Evenement, 'titel' | 'omschrijving' | 'locatie' | 'datum' | 'sluit_aanmelden_op' | 'max_aanmeldingen' | 'status'>>
): Promise<void> {
  const { error } = await getSupabase()
    .from('evenementen')
    .update({ ...w, bijgewerkt_op: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function verwijderEvenement(id: string): Promise<void> {
  const { error } = await getSupabase().from('evenementen').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function haalAanmeldingenOp(evenementId: string): Promise<EvenementAanmelding[]> {
  const { data, error } = await getSupabase()
    .from('evenement_aanmeldingen')
    .select('*')
    .eq('evenement_id', evenementId)
    .order('aangemeld_op', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function verwijderAanmelding(id: string): Promise<void> {
  const { error } = await getSupabase().from('evenement_aanmeldingen').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// Handmatig een aanmelding toevoegen namens een beheerder (bv. telefonische
// aanmelding). Zelfde dedupe-logica als de publieke aanmeldroute: bestaand
// e-mailadres voor dit evenement wordt bijgewerkt i.p.v. een duplicaat.
export async function voegAanmeldingHandmatigToe(
  evenementId: string, email: string, naam: string, antwoorden: Record<string, string> = {}
): Promise<{ bijgewerkt: boolean }> {
  const supabase = getSupabase()
  const schoneEmail = email.trim().toLowerCase()

  const { data: bestaand } = await supabase
    .from('evenement_aanmeldingen')
    .select('id')
    .eq('evenement_id', evenementId)
    .ilike('email', schoneEmail)
    .maybeSingle()

  let aanmeldingId: string
  let bijgewerkt: boolean

  if (bestaand) {
    const { error } = await supabase
      .from('evenement_aanmeldingen')
      .update({ naam: naam.trim() || null, aangemeld_op: new Date().toISOString() })
      .eq('id', bestaand.id)
    if (error) throw new Error(error.message)
    aanmeldingId = bestaand.id
    bijgewerkt = true
  } else {
    const { data, error } = await supabase.from('evenement_aanmeldingen').insert({
      evenement_id: evenementId,
      email: schoneEmail,
      naam: naam.trim() || null,
    }).select().single()
    if (error) throw new Error(error.message)
    aanmeldingId = data.id
    bijgewerkt = false
  }

  await slaVeldAntwoordenOp(aanmeldingId, antwoorden)
  return { bijgewerkt }
}

// --- Aanvullende velden per evenement -------------------------------------

export async function haalVeldenOp(evenementId: string): Promise<EvenementVeld[]> {
  const { data, error } = await getSupabase()
    .from('evenement_velden')
    .select('*')
    .eq('evenement_id', evenementId)
    .order('volgorde', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function maakVeldAan(
  evenementId: string, label: string, verplicht: boolean, volgorde: number,
  type: EvenementVeldType = 'tekst', opties: string[] | null = null, meerdere: boolean = false
): Promise<EvenementVeld> {
  const { data, error } = await getSupabase()
    .from('evenement_velden')
    .insert([{ evenement_id: evenementId, label, verplicht, volgorde, type, opties: type === 'keuze' ? opties : null, meerdere: type === 'keuze' && meerdere }])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function wijzigVeld(id: string, w: Partial<Pick<EvenementVeld, 'label' | 'verplicht' | 'volgorde' | 'type' | 'opties' | 'meerdere'>>): Promise<void> {
  const { error } = await getSupabase().from('evenement_velden').update(w).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function verwijderVeld(id: string): Promise<void> {
  const { error } = await getSupabase().from('evenement_velden').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// Antwoorden op de aanvullende velden, per aanmelding.

export async function haalAntwoordenOp(aanmeldingIds: string[]): Promise<Record<string, Record<string, string>>> {
  if (aanmeldingIds.length === 0) return {}
  const { data, error } = await getSupabase()
    .from('evenement_veld_antwoorden')
    .select('aanmelding_id, veld_id, waarde')
    .in('aanmelding_id', aanmeldingIds)
  if (error) throw new Error(error.message)
  const resultaat: Record<string, Record<string, string>> = {}
  for (const rij of data ?? []) {
    if (!resultaat[rij.aanmelding_id]) resultaat[rij.aanmelding_id] = {}
    resultaat[rij.aanmelding_id][rij.veld_id] = rij.waarde ?? ''
  }
  return resultaat
}

export async function slaVeldAntwoordenOp(aanmeldingId: string, antwoorden: Record<string, string>): Promise<void> {
  const rijen = Object.entries(antwoorden)
    .filter(([, waarde]) => waarde != null && waarde !== '')
    .map(([veldId, waarde]) => ({ aanmelding_id: aanmeldingId, veld_id: veldId, waarde }))
  if (rijen.length === 0) return
  const { error } = await getSupabase()
    .from('evenement_veld_antwoorden')
    .upsert(rijen, { onConflict: 'aanmelding_id,veld_id' })
  if (error) throw new Error(error.message)
}
