import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

const TOEGESTANE_ROLLEN = ['superadmin', 'directie', 'leidinggevende']

function genereerToken(profielId: string): string {
  const secret = process.env.ICAL_SECRET!
  return createHmac('sha256', secret).update(profielId).digest('hex')
}

function valideerToken(token: string, profielId: string): boolean {
  return token === genereerToken(profielId)
}

function escapeIcs(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function formatIcsDate(iso: string, heledag: boolean): string {
  const d = new Date(iso)
  if (heledag) {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  }
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const token = searchParams.get('token')
  const profielId = searchParams.get('uid')

  if (!token || !profielId) {
    return new NextResponse('Ongeldig verzoek', { status: 400 })
  }

  if (!valideerToken(token, profielId)) {
    return new NextResponse('Ongeautoriseerd', { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Rol controleren
  const { data: profiel } = await supabase
    .from('profielen')
    .select('rol, naam')
    .eq('id', profielId)
    .single()

  if (!profiel || !TOEGESTANE_ROLLEN.includes(profiel.rol)) {
    return new NextResponse('Geen toegang', { status: 403 })
  }

  // Alle kalenders ophalen
  const { data: kalenders } = await supabase
    .from('agenda_kalenders')
    .select('id, naam')

  const kalenderIds = (kalenders ?? []).map((k: { id: string }) => k.id)

  if (kalenderIds.length === 0) {
    return new NextResponse('Geen kalenders gevonden', { status: 404 })
  }

  // Alle afspraken ophalen
  const { data: afspraken } = await supabase
    .from('agenda_afspraken')
    .select('*')
    .in('kalender_id', kalenderIds)
    .order('start_tijd')

  const nu = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const events = (afspraken ?? []).map((a: {
    id: string; titel: string; beschrijving: string | null
    start_tijd: string; eind_tijd: string; hele_dag: boolean
  }) => {
    const lines = [
      'BEGIN:VEVENT',
      `UID:${a.id}@theepot-dashboard`,
      `DTSTAMP:${nu}`,
    ]
    if (a.hele_dag) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(a.start_tijd, true)}`)
      lines.push(`DTEND;VALUE=DATE:${formatIcsDate(a.eind_tijd, true)}`)
    } else {
      lines.push(`DTSTART:${formatIcsDate(a.start_tijd, false)}`)
      lines.push(`DTEND:${formatIcsDate(a.eind_tijd, false)}`)
    }
    lines.push(`SUMMARY:${escapeIcs(a.titel)}`)
    if (a.beschrijving) lines.push(`DESCRIPTION:${escapeIcs(a.beschrijving)}`)
    lines.push('END:VEVENT')
    return lines.join('\r\n')
  })

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//De Theepot//Dashboard Agenda//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Theepot Agenda`,
    `X-WR-TIMEZONE:Europe/Amsterdam`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="theepot-agenda.ics"',
      'Cache-Control': 'no-cache, no-store',
    },
  })
}
