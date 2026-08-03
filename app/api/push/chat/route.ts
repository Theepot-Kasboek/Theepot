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
  pagina_chat: Toegang | null
}

const GELDIGE_TOEGANG: Toegang[] = ['geen', 'lezen', 'bewerken']

function normaliseerToegang(waarde: unknown): Toegang {
  return GELDIGE_TOEGANG.includes(waarde as Toegang) ? (waarde as Toegang) : 'geen'
}

// Altijd 200 teruggeven — dit endpoint wordt aangeroepen door een pg_net
// trigger die geen retries heeft; een non-200 lost niets op en vervuilt
// alleen net._http_response als deliverylog.
function ok(reden: string) {
  return NextResponse.json({ ok: true, reden })
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-theepot-push-secret')
  if (!secret || secret !== process.env.PUSH_WEBHOOK_SECRET) {
    return new NextResponse('Ongeautoriseerd', { status: 401 })
  }

  let berichtId: string | undefined
  try {
    const body = await req.json()
    berichtId = body.bericht_id
  } catch {
    return ok('ongeldige body')
  }
  if (!berichtId) return ok('geen bericht_id')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: bericht } = await supabase
    .from('chat_berichten')
    .select('id, gesprek_id, afzender_id, bericht_type')
    .eq('id', berichtId)
    .single()
  if (!bericht || !bericht.afzender_id) return ok('bericht niet gevonden')

  const { data: gesprek } = await supabase
    .from('chat_gesprekken')
    .select('id, naam, type')
    .eq('id', bericht.gesprek_id)
    .single()
  if (!gesprek) return ok('gesprek niet gevonden')

  const { data: afzender } = await supabase
    .from('profielen')
    .select('id, naam, rol, actief')
    .eq('id', bericht.afzender_id)
    .single()
  if (!afzender) return ok('afzender niet gevonden')

  const { data: deelnemers } = await supabase
    .from('chat_deelnemers')
    .select('profiel_id')
    .eq('gesprek_id', gesprek.id)

  const kandidaatIds = (deelnemers ?? [])
    .map((d: { profiel_id: string }) => d.profiel_id)
    .filter((id: string) => id !== bericht.afzender_id)

  if (kandidaatIds.length === 0) return ok('geen ontvangers')

  // Vier queries voor de hele batch (niet per persoon), zelfde
  // rechten-resolutie als components/AuthProvider.tsx.
  const { data: profielen } = await supabase.from('profielen').select('id, naam, rol, actief').in('id', kandidaatIds)
  const rollen = Array.from(new Set((profielen ?? []).map((p: Profiel) => p.rol)))

  const [{ data: accountRechten }, { data: rolRechten }] = await Promise.all([
    supabase.from('rechten').select('profiel_id, rol, pagina_chat').in('profiel_id', kandidaatIds),
    rollen.length > 0
      ? supabase.from('rechten').select('profiel_id, rol, pagina_chat').in('rol', rollen)
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
    const toegang = normaliseerToegang(gekozenRecht?.pagina_chat)
    return toegang === 'lezen' || toegang === 'bewerken'
  })

  if (ontvangerIds.length === 0) return ok('alle ontvangers onderdrukt')

  // Badge per ontvanger (alleen relevant voor iOS, kost weinig voor Android).
  const badgePerProfiel: Record<string, number> = {}
  await Promise.all(ontvangerIds.map(async (id: string) => {
    const { data } = await supabase.rpc('ongelezen_chat_aantal', { p_profiel_id: id })
    if (typeof data === 'number') badgePerProfiel[id] = data
  }))

  const isGroep = gesprek.type === 'groep'
  const titel = isGroep ? gesprek.naam : afzender.naam
  const body = isGroep
    ? `Nieuw bericht van ${afzender.naam}`
    : (bericht.bericht_type === 'bestand' ? 'Nieuw bestand' : 'Nieuw bericht')

  await verstuurPush(supabase, {
    type: 'chat',
    profielIds: ontvangerIds,
    titel,
    body,
    data: { type: 'chat', gesprek_id: gesprek.id, bericht_id: bericht.id },
    badgePerProfiel,
    collapseId: gesprek.id,
  })

  return ok('verstuurd')
}
