import { getSupabase } from '@/lib/supabase'

// ─── Generiek meldingen-systeem ────────────────────────────────────────────
// Wordt gebruikt door o.a. kasboek en brandoefening zodra een maand/week
// wordt afgerond. Wie een melding krijgt, wordt vooraf ingesteld via
// Rechtenbeheer > tab "Meldingen" (tabel melding_voorkeuren).

export interface Melding {
  id: string
  type: string
  titel: string
  bericht: string
  link: string | null
  context: Record<string, unknown> | null
  aangemaakt_op: string
  aangemaakt_door: string | null
  gelezen_op: string | null
  ontvanger_id: string
}

// Maakt een melding aan en verstuurt 'm naar iedereen die voor dit type
// meldingen is ingesteld (melding_voorkeuren). Faalt zacht: een mislukte
// melding mag het afronden zelf nooit blokkeren.
export async function maakMelding(opts: {
  type: string
  titel: string
  bericht: string
  link?: string
  context?: Record<string, unknown>
  aangemaakt_door?: string | null
}): Promise<void> {
  try {
    const supabase = getSupabase()
    const { data: voorkeuren } = await supabase
      .from('melding_voorkeuren')
      .select('profiel_id')
      .eq('type', opts.type)

    const ontvangers = (voorkeuren ?? []) as { profiel_id: string }[]
    if (ontvangers.length === 0) return

    const { data: melding, error } = await supabase
      .from('meldingen')
      .insert({
        type: opts.type,
        titel: opts.titel,
        bericht: opts.bericht,
        link: opts.link ?? null,
        context: opts.context ?? null,
        aangemaakt_door: opts.aangemaakt_door ?? null,
      })
      .select()
      .single()

    if (error || !melding) return

    await supabase.from('melding_ontvangers').insert(
      ontvangers.map(o => ({ melding_id: (melding as { id: string }).id, profiel_id: o.profiel_id }))
    )
  } catch {
    // Meldingen mogen het afronden zelf nooit laten mislukken.
  }
}

export async function haalMeldingenOp(profielId: string, limiet = 20): Promise<Melding[]> {
  const { data, error } = await getSupabase()
    .from('melding_ontvangers')
    .select('id, gelezen_op, profiel_id, meldingen(id, type, titel, bericht, link, context, aangemaakt_op, aangemaakt_door)')
    .eq('profiel_id', profielId)
    .order('id', { ascending: false })
    .limit(limiet)

  if (error || !data) return []

  type Rij = {
    gelezen_op: string | null
    profiel_id: string
    meldingen: {
      id: string; type: string; titel: string; bericht: string
      link: string | null; context: Record<string, unknown> | null
      aangemaakt_op: string; aangemaakt_door: string | null
    } | null
  }

  return (data as unknown as Rij[])
    .filter(r => r.meldingen)
    .map(r => ({
      ...r.meldingen!,
      gelezen_op: r.gelezen_op,
      ontvanger_id: r.profiel_id,
    }))
    .sort((a, b) => new Date(b.aangemaakt_op).getTime() - new Date(a.aangemaakt_op).getTime())
}

export async function markeerMeldingGelezen(meldingId: string, profielId: string): Promise<void> {
  await getSupabase()
    .from('melding_ontvangers')
    .update({ gelezen_op: new Date().toISOString() })
    .eq('melding_id', meldingId)
    .eq('profiel_id', profielId)
}
