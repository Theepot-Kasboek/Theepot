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
- Push notificaties (chat, native iOS/Android apps) — Vercel env vars:
  `PUSH_WEBHOOK_SECRET`, `APNS_TEAM_ID`, `APNS_KEY_ID`, `APNS_BUNDLE_ID`,
  `APNS_PRIVATE_KEY_B64`, `FCM_PROJECT_ID`, `FCM_SERVICE_ACCOUNT_B64`.
  Zie `supabase-sql/push_meldingen.sql` voor de databasekant.
- Foto zoeken (Google) bij vakantieplanning-activiteiten — Vercel env vars:
  `GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_ENGINE_ID` (Google Custom Search JSON API,
  Programmable Search Engine met "Image search" aan). Routes:
  `app/api/afbeelding-zoeken` (zoeken) en `app/api/afbeelding-proxy` (ophalen
  zonder CORS-issues). Zonder deze env vars toont de zoekknop een foutmelding
  maar blijft de rest van de pagina werken.
- Superadmin: Rooster@bsodetheepot.nl
- Zip-updates altijd noemen als: Theepot-Dashboard-update.zip
