import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 15

// Zoekt afbeeldingen via de Google Programmable Search (Custom Search JSON API),
// zodat medewerkers vanuit de vakantieplanningen direct een voorbeeldfoto kunnen
// zoeken voor een activiteit. Vereist GOOGLE_CSE_API_KEY + GOOGLE_CSE_ENGINE_ID
// (zie CLAUDE.md voor hoe je die aanmaakt).

interface GoogleImageItem {
  link: string
  title: string
  image?: { thumbnailLink?: string; contextLink?: string }
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_CSE_API_KEY
  const engineId = process.env.GOOGLE_CSE_ENGINE_ID
  if (!apiKey || !engineId) {
    return NextResponse.json({ error: 'Foto zoeken is niet geconfigureerd (ontbrekende GOOGLE_CSE_API_KEY / GOOGLE_CSE_ENGINE_ID).' }, { status: 501 })
  }

  const zoekterm = req.nextUrl.searchParams.get('q')?.trim()
  if (!zoekterm) {
    return NextResponse.json({ error: 'Geen zoekterm opgegeven.' }, { status: 400 })
  }

  const url = new URL('https://www.googleapis.com/customsearch/v1')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('cx', engineId)
  url.searchParams.set('q', zoekterm)
  url.searchParams.set('searchType', 'image')
  url.searchParams.set('safe', 'active')
  url.searchParams.set('num', '10')

  const res = await fetch(url.toString())
  if (!res.ok) {
    const tekst = await res.text().catch(() => '')
    return NextResponse.json({ error: `Google-zoekopdracht mislukt (${res.status}): ${tekst.slice(0, 300)}` }, { status: 502 })
  }

  const data = await res.json()
  const items = ((data.items ?? []) as GoogleImageItem[]).map(item => ({
    url: item.link,
    thumbnail: item.image?.thumbnailLink || item.link,
    titel: item.title,
    bron: item.image?.contextLink || '',
  }))

  return NextResponse.json({ resultaten: items })
}
