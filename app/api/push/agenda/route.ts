import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verstuurPush } from '@/lib/push'

export const runtime = 'nodejs'
export const maxDuration = 30

type Toegang = 'geen' | 'lezen' | 'bewerken'

interface Profiel {
  id: string
  naam: string
  rol: string
  actief: boolean
}

interface RechtenRij {
  profiel_id: string | null
  rol: string | null
  pagina_agenda: Toegang | null
}

interface Kalender {
  id: string
  naam: string
  type: 'persoonlijk' | 'algemeen'
  eigenaar_id: string | null
}

interface Afspraak {
  id: string
  kalender_id: string
  titel: string
  start_tijd: string
  hele_dag: boolean
}

const GELDIGE_TOEGANG: Toegang[] = ['geen', 'lezen', 'bewerken']
const BEVOORRECHTE_ROLLEN = ['superadmin', 'directie', 'leidinggevende']

function normaliseerToegang(waarde: unknown): Toegang {
  return GELDIGE_TOEGANG.includes(waarde as Toegang) ? (waarde as Toegang) : 'geen'
}

// Altijd 200 teruggeven — dit endpoint wordt aangeroepen door een pg_cron
// job via net.http_post, die geen retries heeft; een non-200 lost niets op.
function ok(reden: string) {
  return NextResponse.json({ ok: true, reden })
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-theepot-push-secret')
  if (!secret || secret !== process.env.PUSH_WEBHOOK_SECRET) {
    return new NextResponse('Ongeautoriseerd', { status: 401 })
  }

  let afspraakId: string | undefined
  try {
    const body = await req.json()
    afspraakId = body.afspraak_id
  } catch {
    return ok('ongeldige body')
  }
  if (!afspraakId) return ok('geen afspraak_id')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: afspraak } = await supabase
    .from('agenda_afspraken')
    .select('id, kalender_id, titel, start_tijd, hele_dag')
    .eq('id', afspraakId)
    .single()
  if (!afspraak) return ok('afspraak niet gevonden')

  const { data: kalender } = await supabase
    .from('agenda_kalenders')
    .select('id, naam, type, eigenaar_id')
    .eq('id', (afspraak as Afspraak).kalender_id)
    .single()
  if (!kalender) return ok('kalender niet gevonden')

  // Kandidaten bepalen: eigenaar bij een persoonlijke kalender, of iedereen
  // die de algemene kalender mag zien (bevoorrechte rol of expliciet gedeeld
  // via agenda_gedeeld) bij een algemene kalender.
  let kandidaatIds: string[] = []
  if ((kalender as Kalender).type === 'persoonlijk') {
    if ((kalender as Kalender).eigenaar_id) kandidaatIds = [(kalender as Kalender).eigenaar_id as string]
  } else {
    const { data: gedeeld } = await supabase
      .from('agenda_gedeeld')
      .select('profiel_id')
      .eq('kalender_id', (kalender as Kalender).id)
    const gedeeldIds = (gedeeld ?? []).map((g: { profiel_id: string }) => g.profiel_id)

    const { data: bevoorrecht } = await supabase
      .from('profielen')
      .select('id')
      .in('rol', BEVOORRECHTE_ROLLEN)
    const bevoorrechtIds = (bevoorrecht ?? []).map((p: { id: string }) => p.id)

    kandidaatIds = Array.from(new Set([...gedeeldIds, ...bevoorrechtIds]))
  }

  if (kandidaatIds.length === 0) return ok('geen ontvangers')

  // Zelfde rechten-resolutie als de chat-route: account-rechten gaan voor
  // rol-rechten, superadmin altijd toegestaan.
  const { data: profielen } = await supabase.from('profielen').select('id, naam, rol, actief').in('id', kandidaatIds)
  const rollen = Array.from(new Set((profielen ?? []).map((p: Profiel) => p.rol)))

  const [{ data: accountRechten }, { data: rolRechten }] = await Promise.all([
    supabase.from('rechten').select('profiel_id, rol, pagina_agenda').in('profiel_id', kandidaatIds),
    rollen.length > 0
      ? supabase.from('rechten').select('profiel_id, rol, pagina_agenda').in('rol', rollen)
      : Promise.resolve({ data: [] as RechtenRij[] }),
  ])

  const profielMap = new Map<string, Profiel>((profielen ?? []).map((p: Profiel) => [p.id, p]))
  const accountRechtMap = new Map<string, RechtenRij>((accountRechten ?? []).map((r: RechtenRij) => [r.profiel_id as string, r]))
  const rolRechtMap = new Map<string, RechtenRij>((rolRechten ?? []).map((r: RechtenRij) => [r.rol as string, r]))

  const ontvangerIds = kandidaatIds.filter((id: string) => {
    const p = profielMap.get(id)
    if (!p || !p.actief) return false
    if (p.rol === 'superadmin') return true

    const gekozenRecht = accountRechtMap.get(id) ?? rolRechtMap.get(p.rol)
    const toegang = normaliseerToegang(gekozenRecht?.pagina_agenda)
    return toegang === 'lezen' || toegang === 'bewerken'
  })

  if (ontvangerIds.length === 0) return ok('alle ontvangers onderdrukt')

  const start = new Date((afspraak as Afspraak).start_tijd)
  const tijdLabel = (afspraak as Afspraak).hele_dag
    ? start.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
    : start.toLocaleString('nl-NL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

  await verstuurPush(supabase, {
    type: 'agenda',
    profielIds: ontvangerIds,
    titel: 'Herinnering: ' + (afspraak as Afspraak).titel,
    body: `${(afspraak as Afspraak).titel} — ${tijdLabel}`,
    data: { type: 'agenda', afspraak_id: (afspraak as Afspraak).id, kalender_id: (kalender as Kalender).id },
    collapseId: (afspraak as Afspraak).id,
  })

  return ok('verstuurd')
}
