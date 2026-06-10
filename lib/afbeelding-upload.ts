import { getSupabase } from '@/lib/supabase'

// Centrale upload-functie met stap-voor-stap diagnostiek.
// Rapporteert elke stap via onStatus zodat fouten zichtbaar zijn in de UI.

export const UPLOAD_VERSIE = 'v3.0'

export interface UploadResultaat {
  ok: boolean
  pad: string | null
  stappen: string[]
}

export async function uploadActiviteitAfbeelding(
  activiteitId: string,
  bestand: File,
  onStatus?: (regel: string) => void
): Promise<UploadResultaat> {
  const stappen: string[] = []
  const log = (regel: string) => { stappen.push(regel); onStatus?.(regel) }

  const supabase = getSupabase()

  // Stap 0: toon tegen welk project we praten
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'ONBEKEND'
  const projectRef = url.replace('https://', '').split('.')[0]
  log(`① Project: ${projectRef}`)

  // Stap 1: upload naar storage
  const ext = bestand.name.split('.').pop()?.toLowerCase() || 'jpg'
  const pad = `${activiteitId}.${ext}`
  log(`② Upload starten: ${pad} (${Math.round(bestand.size / 1024)} KB)`)

  const { data: upData, error: upError } = await supabase.storage
    .from('activiteit-afbeeldingen')
    .upload(pad, bestand, { upsert: true })

  if (upError) {
    log(`❌ Storage fout: ${upError.message}`)
    return { ok: false, pad: null, stappen }
  }
  log(`③ Storage OK: ${upData?.path ?? pad}`)

  // Stap 2: update database
  const { error: dbError } = await supabase
    .from('activiteiten')
    .update({ afbeelding_pad: pad })
    .eq('id', activiteitId)

  if (dbError) {
    log(`❌ Database fout: ${dbError.message}`)
    return { ok: false, pad: null, stappen }
  }
  log('④ Database update verstuurd')

  // Stap 3: VERIFICATIE — lees direct terug of het echt is opgeslagen.
  // Een UPDATE met RLS aan zonder policy geeft GEEN fout maar wijzigt 0 rijen.
  const { data: check, error: checkError } = await supabase
    .from('activiteiten')
    .select('afbeelding_pad')
    .eq('id', activiteitId)
    .single()

  if (checkError) {
    log(`❌ Verificatie mislukt: ${checkError.message}`)
    return { ok: false, pad: null, stappen }
  }

  if (check?.afbeelding_pad === pad) {
    log(`✅ Geverifieerd: afbeelding_pad = ${check.afbeelding_pad}`)
    return { ok: true, pad, stappen }
  }

  log(`❌ STILLE FOUT: update gaf geen error maar afbeelding_pad is nog steeds "${check?.afbeelding_pad ?? 'null'}". Dit wijst op Row Level Security op de tabel 'activiteiten'.`)
  return { ok: false, pad: null, stappen }
}
