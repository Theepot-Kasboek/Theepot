export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseService } from '@/lib/supabase-service'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET(req: NextRequest) {
  const evenement_id = req.nextUrl.searchParams.get('evenement_id')
  if (!evenement_id) {
    return NextResponse.json({ error: 'Evenement ontbreekt.' }, { status: 400 })
  }

  const supabase = getSupabaseService()
  const { data: evenement } = await supabase
    .from('evenementen')
    .select('id, titel, omschrijving, locatie, datum, sluit_aanmelden_op, max_aanmeldingen, status')
    .eq('id', evenement_id)
    .single()

  if (!evenement) {
    return NextResponse.json({ error: 'Evenement niet gevonden.' }, { status: 404 })
  }

  let vol = false
  if (evenement.max_aanmeldingen != null) {
    const { count } = await supabase
      .from('evenement_aanmeldingen')
      .select('*', { count: 'exact', head: true })
      .eq('evenement_id', evenement_id)
    vol = (count ?? 0) >= evenement.max_aanmeldingen
  }
  const gesloten = new Date() > new Date(evenement.sluit_aanmelden_op)

  return NextResponse.json({
    titel: evenement.titel,
    omschrijving: evenement.omschrijving,
    locatie: evenement.locatie,
    datum: evenement.datum,
    status: evenement.status,
    vol,
    gesloten,
  })
}

export async function POST(req: NextRequest) {
  try {
    const { evenement_id, email, naam } = await req.json()

    if (!evenement_id || !email || !String(email).trim()) {
      return NextResponse.json({ error: 'Vul een e-mailadres in.' }, { status: 400 })
    }
    const schoneEmail = String(email).trim().toLowerCase()
    if (!EMAIL_REGEX.test(schoneEmail)) {
      return NextResponse.json({ error: 'Vul een geldig e-mailadres in.' }, { status: 400 })
    }

    const supabase = getSupabaseService()
    const { data: evenement } = await supabase
      .from('evenementen')
      .select('id, status, sluit_aanmelden_op, max_aanmeldingen')
      .eq('id', evenement_id)
      .single()
    if (!evenement) {
      return NextResponse.json({ error: 'Evenement niet gevonden.' }, { status: 400 })
    }
    if (evenement.status !== 'actief') {
      return NextResponse.json({ error: 'Dit evenement is niet meer open voor aanmeldingen.' }, { status: 400 })
    }
    if (new Date() > new Date(evenement.sluit_aanmelden_op)) {
      return NextResponse.json({ error: 'Aanmelden voor dit evenement is gesloten.' }, { status: 400 })
    }

    const { data: bestaand } = await supabase
      .from('evenement_aanmeldingen')
      .select('id')
      .eq('evenement_id', evenement_id)
      .ilike('email', schoneEmail)
      .maybeSingle()

    if (bestaand) {
      const { error } = await supabase
        .from('evenement_aanmeldingen')
        .update({
          naam: naam?.trim() || null,
          aangemeld_op: new Date().toISOString(),
        })
        .eq('id', bestaand.id)
      if (error) throw error
      return NextResponse.json({ succes: true, al_aangemeld: true })
    }

    if (evenement.max_aanmeldingen != null) {
      const { count } = await supabase
        .from('evenement_aanmeldingen')
        .select('*', { count: 'exact', head: true })
        .eq('evenement_id', evenement_id)
      if ((count ?? 0) >= evenement.max_aanmeldingen) {
        return NextResponse.json({ error: 'Dit evenement is helaas vol.' }, { status: 400 })
      }
    }

    const { error } = await supabase.from('evenement_aanmeldingen').insert({
      evenement_id,
      email: schoneEmail,
      naam: naam?.trim() || null,
    })
    if (error) throw error

    return NextResponse.json({ succes: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[evenementen-aanmelden]', msg)
    return NextResponse.json({ error: 'Aanmelden mislukt: ' + msg }, { status: 500 })
  }
}
