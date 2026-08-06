import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 15

// Haalt een externe afbeelding (bijv. een Google-zoekresultaat) server-side op,
// zodat de browser 'm same-origin kan downloaden en als bestand kan uploaden
// (rechtstreeks vanaf de client tegen externe hosts loopt vaak vast op CORS).

const TOEGESTANE_PROTOCOLLEN = ['http:', 'https:']

export async function GET(req: NextRequest) {
  const bron = req.nextUrl.searchParams.get('url')
  if (!bron) {
    return NextResponse.json({ error: 'Geen url opgegeven.' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(bron)
  } catch {
    return NextResponse.json({ error: 'Ongeldige url.' }, { status: 400 })
  }
  if (!TOEGESTANE_PROTOCOLLEN.includes(parsed.protocol)) {
    return NextResponse.json({ error: 'Ongeldig protocol.' }, { status: 400 })
  }

  const res = await fetch(parsed.toString(), { headers: { 'User-Agent': 'Mozilla/5.0 (TheepotDashboard afbeelding-proxy)' } })
  if (!res.ok || !res.body) {
    return NextResponse.json({ error: `Ophalen mislukt (${res.status}).` }, { status: 502 })
  }

  const contentType = res.headers.get('content-type') || 'image/jpeg'
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'Bron is geen afbeelding.' }, { status: 415 })
  }

  return new NextResponse(res.body, { headers: { 'Content-Type': contentType, 'Cache-Control': 'private, max-age=300' } })
}
