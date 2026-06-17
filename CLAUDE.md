# Theepot Dashboard — Claude Code instructies

## Over dit project
Dit is het interne dashboard voor De Theepot Kinderopvang, gebouwd door Lucas Molenkamp (De Molen Software).

## Stack
- **Framework:** Next.js 14 (App Router)
- **Taal:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL + Realtime + Storage)
- **Hosting:** Vercel

## Projectstructuur
- `app/` — alle pagina's en routes (App Router)
- `components/` — herbruikbare React componenten
- `lib/` — hulpfuncties, Supabase client, utilities
- `public/` — statische bestanden
- `ios/` — iOS-gerelateerde bestanden (niet aanraken tenzij gevraagd)
- `middleware.ts` — authenticatie middleware

## GitHub
- Repository: via Git in deze map
- Bij elke update: commit met duidelijke Nederlandse beschrijving + push naar main

## Conventies
- Schrijf alle code in TypeScript
- Gebruik Nederlandse variabelenamen/comments waar logisch
- Gebruik `Array.from(new Set(...))` in plaats van `[...new Set(...)]`
- Componenten in `components/`, paginalogica in `app/`
- Supabase client importeren vanuit `lib/`

## Modules in dit project
Rooster, Chat, Kasboek, Activiteiten, Nieuwsbrieven, Agenda, Prikbord, VE Planning, Zoeken, Archief, Activiteitenlog en meer.

## Belangrijk
- Vercel env vars: `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Superadmin: Rooster@bsodetheepot.nl
- Zip-updates altijd noemen als: Theepot-Dashboard-update.zip
