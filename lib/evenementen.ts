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
  evenementId: string, email: string, naam: string
): Promise<{ bijgewerkt: boolean }> {
  const supabase = getSupabase()
  const schoneEmail = email.trim().toLowerCase()

  const { data: bestaand } = await supabase
    .from('evenement_aanmeldingen')
    .select('id')
    .eq('evenement_id', evenementId)
    .ilike('email', schoneEmail)
    .maybeSingle()

  if (bestaand) {
    const { error } = await supabase
      .from('evenement_aanmeldingen')
      .update({ naam: naam.trim() || null, aangemeld_op: new Date().toISOString() })
      .eq('id', bestaand.id)
    if (error) throw new Error(error.message)
    return { bijgewerkt: true }
  }

  const { error } = await supabase.from('evenement_aanmeldingen').insert({
    evenement_id: evenementId,
    email: schoneEmail,
    naam: naam.trim() || null,
  })
  if (error) throw new Error(error.message)
  return { bijgewerkt: false }
}
