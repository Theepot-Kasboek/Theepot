// Types en helpers voor de campagnes-module (sleep-en-klik e-mailbouwer).
// Zie supabase-sql/campagnes.sql voor het databasemodel.

export type Uitlijning = 'links' | 'midden' | 'rechts'

// Web-safe lettertypes die betrouwbaar renderen in alle grote mailclients
// (Outlook, Gmail, Apple Mail, ...) — bewust geen Google Fonts o.i.d., die
// vallen in veel mailclients terug op het systeemlettertype.
export const LETTERTYPEN = [
  { waarde: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { waarde: "Georgia, 'Times New Roman', serif", label: 'Georgia' },
  { waarde: "'Trebuchet MS', sans-serif", label: 'Trebuchet MS' },
  { waarde: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
  { waarde: "'Courier New', Courier, monospace", label: 'Courier New' },
] as const

// Herbruikbare tekststijl-velden. Niet elke plek gebruikt alle velden (bv.
// regelafstand is zinloos bij één regel), maar de velden heten overal
// hetzelfde zodat de bedienings-UI herbruikbaar is.
export interface TekstStijlVelden {
  lettertype?: string
  kleur?: string
  vet?: boolean
  cursief?: boolean
  regelafstand?: number // regelhoogte-factor, bv. 1.2 - 2.4
}

export interface TekstBlok extends TekstStijlVelden {
  id: string
  type: 'tekst'
  // Rijke tekst: opgeslagen als beperkte HTML (alleen <p>/<br>/<strong>/<em>/
  // <b>/<i>/<ul>/<li>, zie sanitizeRijkeTekst) zodat losse stukjes tekst
  // binnen het blok hun eigen vet/cursief kunnen hebben i.p.v. het hele blok.
  // Oudere campagnes bevatten hier nog platte tekst (met \n en • -bullets);
  // isRijkeTekstHtml() onderscheidt de twee vormen bij het renderen.
  tekst: string
  tekstgrootte?: number
  uitlijning?: Uitlijning
  // Optionele kop boven de tekst van dit blok.
  kop?: string
  kopStijl?: Omit<TekstStijlVelden, 'regelafstand'>
}

export interface AfbeeldingInhoud {
  pad: string | null
  link: string
  bijschrift: string
  breedte?: number // percentage, 10-100
  bijschriftStijl?: Omit<TekstStijlVelden, 'regelafstand'>
}

export interface AfbeeldingBlok extends AfbeeldingInhoud {
  id: string
  type: 'afbeelding'
  uitlijning?: Uitlijning
}

export interface KnopInhoud {
  label: string
  url: string
  achtergrondkleur?: string
  tekstkleur?: string
  lettertype?: string
  vet?: boolean
  cursief?: boolean
}

export interface KnopBlok extends KnopInhoud {
  id: string
  type: 'knop'
  uitlijning?: Uitlijning
}

export interface QrBlok {
  id: string
  type: 'qr'
  waarde: string
  bijschrift: string
  grootte?: number // px, 80-240
  uitlijning?: Uitlijning
  bijschriftStijl?: Omit<TekstStijlVelden, 'regelafstand'>
}

export interface ReclameInhoud {
  pad: string | null
  link: string
  titel: string
  tekst: string
  titelStijl?: Omit<TekstStijlVelden, 'regelafstand'>
  tekstStijl?: TekstStijlVelden
}

export interface ReclameBlok extends ReclameInhoud {
  id: string
  type: 'reclame'
}

export interface ScheidingBlok {
  id: string
  type: 'scheiding'
  hoogte?: number // px, 4-80
  lijn?: boolean
  lijnkleur?: string
  lijndikte?: number // px, 1-8
}

// Officiële, vereenvoudigde logo-paden (bron: Simple Icons, CC0) op een
// 24x24-canvas, zodat we het echte platformlogo kunnen tonen i.p.v. losse
// letters. Geen externe afbeelding nodig — wordt als data-URI gerenderd.
export const SOCIAL_PLATFORMS = [
  { waarde: 'facebook', label: 'Facebook', kleur: '#1877F2',
    pad: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z' },
  { waarde: 'instagram', label: 'Instagram', kleur: '#C13584',
    pad: 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077' },
  { waarde: 'linkedin', label: 'LinkedIn', kleur: '#0A66C2',
    pad: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
  { waarde: 'x', label: 'X (Twitter)', kleur: '#000000',
    pad: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z' },
  { waarde: 'youtube', label: 'YouTube', kleur: '#FF0000',
    pad: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
  { waarde: 'tiktok', label: 'TikTok', kleur: '#000000',
    pad: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' },
] as const
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]['waarde']

function svgDataUri(svg: string): string {
  const base64 = typeof Buffer !== 'undefined' ? Buffer.from(svg).toString('base64') : btoa(svg)
  return `data:image/svg+xml;base64,${base64}`
}

// Rondje met het platformlogo erin, als data-URI (geen losse afbeelding
// nodig). Werkt in zo goed als alle mailclients die <img>-data-URI's tonen;
// uitzondering is de klassieke Outlook-desktopweergave (Word-engine), die
// geeft dan een leeg vlak — vergelijkbaar met hoe de meeste nieuwsbrieven
// social-iconen tonen.
export function socialIconDataUri(platform: SocialPlatform): string {
  const p = SOCIAL_PLATFORMS.find(p => p.waarde === platform)
  if (!p) return ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="18" fill="${p.kleur}"/><g transform="translate(7.2,7.2) scale(0.9)"><path d="${p.pad}" fill="#ffffff"/></g></svg>`
  return svgDataUri(svg)
}

export interface SocialLink {
  platform: SocialPlatform
  url: string
}

export interface SocialsBlok {
  id: string
  type: 'socials'
  links: SocialLink[]
  uitlijning?: Uitlijning
}

// Eén kant van een CombinatieBlok: elk los blok-type kan hier staan.
export type Kolom =
  | ({ soort: 'tekst'; tekst: string; knopOnder?: KnopInhoud; kop?: string; kopStijl?: Omit<TekstStijlVelden, 'regelafstand'> } & TekstStijlVelden)
  | ({ soort: 'afbeelding'; knopOnder?: KnopInhoud } & AfbeeldingInhoud)
  | ({ soort: 'knop' } & KnopInhoud)
  | ({ soort: 'reclame' } & ReclameInhoud)

// Combinatieblok: twee onderdelen naast elkaar (horizontaal, elk met een
// aandeel in de breedte) of onder elkaar (verticaal, in deze volgorde).
// Hiermee is elke combinatie te maken: tekst+afbeelding, tekst+knop,
// afbeelding+knop, etc. — "eerste"/"tweede" bepaalt links/boven,
// "wisselen" verwisselt de volgorde (dus rechts/onder wordt links/boven).
export interface CombinatieBlok {
  id: string
  type: 'rij'
  richting?: 'horizontaal' | 'verticaal'
  breedteEerste?: number // percentage van de eerste kolom bij horizontaal, 20-80
  links: Kolom
  rechts: Kolom
}

export type CampagneBlok = TekstBlok | AfbeeldingBlok | KnopBlok | QrBlok | ReclameBlok | ScheidingBlok | SocialsBlok | CombinatieBlok

export interface Campagne {
  id: string
  titel: string
  onderwerp: string
  afzender_naam: string | null
  blokken: CampagneBlok[]
  status: 'concept' | 'verzonden'
  aangemaakt_op: string
  bijgewerkt_op: string
  verzonden_op: string | null
}

// Singleton-rij: Theepot heeft maar één huisstijl, dus geen organisatie_id.
export interface CampagneHuisstijl {
  id: number
  logo_pad: string | null
  merkkleur: string | null
  achtergrondkleur: string | null
  koptekst: string | null
  voettekst: string | null
  bijgewerkt_op: string
}

export interface BlokSjabloon {
  id: string
  naam: string
  blok: CampagneBlok
  aangemaakt_op: string
}

// Heel-nieuwsbrief-sjabloon: de volledige blokkenopbouw van een campagne,
// waarbij je per blok kiest of de ingevulde inhoud bewaard blijft (bv.
// socials, een vaste knop) of leeggemaakt wordt (foto's, verhaaltjes) zodat
// je 'm opnieuw kan invullen voor een volgende nieuwsbrief.
export interface CampagneSjabloon {
  id: string
  naam: string
  blokken: CampagneBlok[]
  aangemaakt_op: string
}

export const CAMPAGNE_AFBEELDINGEN_BUCKET = 'campagne-afbeeldingen'
export const STANDAARD_MERKKLEUR = '#3D6B1A'
export const STANDAARD_ACHTERGRONDKLEUR = '#F4F9EC'

// Maximale breedte van de mailkaart. "Fluid": op desktop/in brede
// mailvensters centreert de kaart op deze breedte (minder kale witruimte
// opzij dan de oude vaste 600px); op telefoon vult de kaart de volle
// schermbreedte i.p.v. dat de hele mail (tekst incluis) wordt
// teruggeschaald door de mail-app om in een kleiner scherm te passen.
const EMAIL_BREEDTE = 640
const EMAIL_PADDING = 28
const EMAIL_INHOUD_BREEDTE = EMAIL_BREEDTE - EMAIL_PADDING * 2

export function nieuwBlokId(): string {
  return Math.random().toString(36).slice(2)
}

export function nieuweKolomInhoud(soort: Kolom['soort']): Kolom {
  switch (soort) {
    case 'tekst': return { soort: 'tekst', tekst: '' }
    case 'afbeelding': return { soort: 'afbeelding', pad: null, link: '', bijschrift: '' }
    case 'knop': return { soort: 'knop', label: 'Bekijk meer', url: '' }
    case 'reclame': return { soort: 'reclame', pad: null, link: '', titel: '', tekst: '' }
  }
}

export function nieuwBlok(type: CampagneBlok['type']): CampagneBlok {
  const id = nieuwBlokId()
  switch (type) {
    case 'tekst':
      return { id, type: 'tekst', tekst: '' }
    case 'afbeelding':
      return { id, type: 'afbeelding', pad: null, link: '', bijschrift: '' }
    case 'knop':
      return { id, type: 'knop', label: 'Bekijk meer', url: '' }
    case 'qr':
      return { id, type: 'qr', waarde: '', bijschrift: '' }
    case 'reclame':
      return { id, type: 'reclame', pad: null, link: '', titel: '', tekst: '' }
    case 'scheiding':
      return { id, type: 'scheiding', hoogte: 24, lijn: false }
    case 'socials':
      return { id, type: 'socials', links: [], uitlijning: 'midden' }
    case 'rij':
      return {
        id, type: 'rij', richting: 'horizontaal', breedteEerste: 50,
        links: { soort: 'tekst', tekst: '' },
        rechts: { soort: 'afbeelding', pad: null, link: '', bijschrift: '' },
      }
  }
}

// Diepe kloon van een blok met een nieuw, uniek id (voor "dupliceren").
// Afbeeldingspaden worden hergebruikt (zelfde bestand) — pas bij het
// vervangen van de foto krijgt de kloon zijn eigen opslagpad.
export function kloonBlok(blok: CampagneBlok): CampagneBlok {
  return { ...JSON.parse(JSON.stringify(blok)), id: nieuwBlokId() }
}

// Voor het instantiëren van een heel campagne-sjabloon: elk blok krijgt een
// vers id (zodat QR-codes, uploadpaden en dnd-keys niet botsen met eerdere
// campagnes die van hetzelfde sjabloon zijn gemaakt).
export function kloonBlokken(blokken: CampagneBlok[]): CampagneBlok[] {
  return blokken.map(kloonBlok)
}

function leegKnopInhoud(k: KnopInhoud): KnopInhoud {
  return { ...k, label: '', url: '' }
}

function leegKolomInhoud(kolom: Kolom): Kolom {
  switch (kolom.soort) {
    case 'tekst':
      return { ...kolom, tekst: '', ...(kolom.kop !== undefined ? { kop: '' } : {}), knopOnder: kolom.knopOnder ? leegKnopInhoud(kolom.knopOnder) : undefined }
    case 'afbeelding':
      return { ...kolom, pad: null, bijschrift: '', link: '', knopOnder: kolom.knopOnder ? leegKnopInhoud(kolom.knopOnder) : undefined }
    case 'knop':
      return leegKnopInhoud(kolom) as Kolom
    case 'reclame':
      return { ...kolom, pad: null, titel: '', tekst: '', link: '' }
  }
}

// Maakt de ingevulde inhoud (tekst, foto's, links/urls) van een blok leeg,
// maar laat alle structuur- en stijlvelden (lettertype, kleur, uitlijning,
// breedte, richting, ...) precies zoals ze waren. Gebruikt bij het opslaan
// van een heel-nieuwsbrief-sjabloon voor blokken die je niet als "bewaren"
// markeert.
export function leegBlokInhoud(blok: CampagneBlok): CampagneBlok {
  switch (blok.type) {
    case 'tekst':
      return { ...blok, tekst: '', ...(blok.kop !== undefined ? { kop: '' } : {}) }
    case 'afbeelding':
      return { ...blok, pad: null, bijschrift: '', link: '' }
    case 'knop':
      return { ...blok, ...leegKnopInhoud(blok) }
    case 'qr':
      return { ...blok, waarde: '', bijschrift: '' }
    case 'reclame':
      return { ...blok, pad: null, titel: '', tekst: '', link: '' }
    case 'scheiding':
      return blok
    case 'socials':
      return { ...blok, links: blok.links.map(l => ({ ...l, url: '' })) }
    case 'rij':
      return { ...blok, links: leegKolomInhoud(blok.links), rechts: leegKolomInhoud(blok.rechts) }
  }
}

export function afbeeldingUrl(pad: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${CAMPAGNE_AFBEELDINGEN_BUCKET}/${pad}`
}

export function logoUrl(pad: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${CAMPAGNE_AFBEELDINGEN_BUCKET}/${pad}`
}

function escapeHtml(tekst: string): string {
  return tekst
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function uitlijningNaarHtml(u: Uitlijning | undefined): 'left' | 'center' | 'right' {
  return u === 'midden' ? 'center' : u === 'rechts' ? 'right' : 'left'
}

// Bouwt een inline-style-fragment voor tekststijl-velden. grootte/regelafstand
// worden alleen meegenomen als een standaardwaarde is opgegeven (sommige
// tekstvelden, zoals bijschriften, hebben geen eigen grootte/regelafstand).
function tekstStijlCss(stijl: TekstStijlVelden | undefined, opts: { grootte?: number; regelafstandStandaard?: number; kleurStandaard?: string } = {}): string {
  const lettertype = stijl?.lettertype || LETTERTYPEN[0].waarde
  const kleur = stijl?.kleur || opts.kleurStandaard || '#1A2E0D'
  const gewicht = stijl?.vet ? 700 : 400
  const schuin = stijl?.cursief ? 'italic' : 'normal'
  const regel = opts.regelafstandStandaard !== undefined ? (stijl?.regelafstand ?? opts.regelafstandStandaard) : undefined
  return `font-family:${lettertype};color:${kleur};font-weight:${gewicht};font-style:${schuin};${opts.grootte !== undefined ? `font-size:${opts.grootte}px;` : ''}${regel !== undefined ? `line-height:${regel};` : ''}`
}

// Tags die de rijke-tekst-editor (contentEditable) mag produceren en die
// zonder verdere opmaak de mail in mogen. Alles daarbuiten (attributen,
// scripts, andere tags) wordt eruit gesloopt in sanitizeRijkeTekst.
const RIJKE_TEKST_TOEGESTANE_TAGS = new Set(['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'li'])

// Onderscheidt rijke HTML (nieuw, per-fragment vet/cursief) van platte tekst
// (oude campagnes, met \n en • -bullets) zodat tekstNaarHtml allebei kan
// renderen.
export function isRijkeTekstHtml(tekst: string): boolean {
  return /<(p|br|strong|em|b|i|ul|li)(\s|\/|>)/i.test(tekst)
}

// Striptwrapt elke tag die niet in de allowlist staat (inhoud blijft staan,
// alleen de tag zelf verdwijnt) en verwijdert alle attributen van de
// overgebleven tags. Zo kan HTML uit een contentEditable-element nooit
// scripts, event-handlers of onverwachte opmaak de mail in smokkelen.
export function sanitizeRijkeTekst(html: string): string {
  let schoon = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
  schoon = schoon.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tag: string) => {
    const naam = tag.toLowerCase()
    if (!RIJKE_TEKST_TOEGESTANE_TAGS.has(naam)) return ''
    return match.startsWith('</') ? `</${naam}>` : `<${naam}>`
  })
  return schoon
}

// Rijke tekst (al sanitized) krijgt alleen e-mailvriendelijke marges/padding
// op de blok-tags; <strong>/<em>/<b>/<i> blijven ongemoeid staan.
function rijkeTekstNaarHtml(html: string): string {
  let out = sanitizeRijkeTekst(html)
  out = out.replace(/<p>/g, '<p style="margin:0 0 12px;">')
  out = out.replace(/<ul>/g, '<ul style="margin:0 0 12px;padding-left:20px;">')
  out = out.replace(/<li>/g, '<li style="margin-bottom:4px;">')
  return out
}

function tekstNaarHtml(tekst: string): string {
  if (isRijkeTekstHtml(tekst)) return rijkeTekstNaarHtml(tekst)

  const regels = tekst.split('\n')
  const html: string[] = []
  let bulletsOpen = false

  for (const regel of regels) {
    const isBullet = regel.trimStart().startsWith('• ') || regel.trimStart().startsWith('- ')
    if (isBullet) {
      if (!bulletsOpen) { html.push('<ul style="margin:0 0 12px;padding-left:20px;">'); bulletsOpen = true }
      const inhoud = regel.trimStart().replace(/^[•-]\s*/, '')
      html.push(`<li style="margin-bottom:4px;">${escapeHtml(inhoud)}</li>`)
    } else {
      if (bulletsOpen) { html.push('</ul>'); bulletsOpen = false }
      if (regel.trim()) html.push(`<p style="margin:0 0 12px;">${escapeHtml(regel)}</p>`)
    }
  }
  if (bulletsOpen) html.push('</ul>')
  return html.join('\n')
}

// Platte-tekstvorm van tekst/kop, voor leegte-checks ("heeft dit blok
// inhoud") ongeacht of het rijke HTML of oude platte tekst is.
function rijkeTekstNaarPlat(tekst: string): string {
  return tekst.replace(/<[^>]*>/g, '').trim()
}

function afbeeldingInhoudNaarHtml(data: AfbeeldingInhoud, align: 'left' | 'center' | 'right', maxBreedtePx: number): string {
  if (!data.pad) return ''
  const breedte = data.breedte ?? 100
  const img = `<img src="${afbeeldingUrl(data.pad)}" alt="${escapeHtml(data.bijschrift)}" style="width:${breedte}%;max-width:${Math.round(maxBreedtePx * breedte / 100)}px;display:block;border-radius:8px;" />`
  const omlijnd = data.link ? `<a href="${escapeHtml(data.link)}" target="_blank" rel="noopener noreferrer">${img}</a>` : img
  const bijschriftCss = tekstStijlCss(data.bijschriftStijl, { grootte: 12, kleurStandaard: '#5B7A44' })
  const bijschrift = data.bijschrift ? `<p style="margin:8px 0 0;${bijschriftCss}text-align:${align};">${escapeHtml(data.bijschrift)}</p>` : ''
  return `<div style="text-align:${align};">${omlijnd}${bijschrift}</div>`
}

function knopInhoudNaarHtml(data: KnopInhoud, align: 'left' | 'center' | 'right'): string {
  if (!data.url) return ''
  const achtergrond = data.achtergrondkleur || STANDAARD_MERKKLEUR
  const tekstkleur = data.tekstkleur || '#ffffff'
  const lettertype = data.lettertype || LETTERTYPEN[0].waarde
  const gewicht = data.vet === false ? 400 : 600
  const schuin = data.cursief ? 'italic' : 'normal'
  return `
    <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
      <tr><td align="${align}">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="border-radius:10px;background:${achtergrond};">
            <a href="${escapeHtml(data.url)}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:12px 24px;font-family:${lettertype};font-size:14px;font-weight:${gewicht};font-style:${schuin};color:${tekstkleur};text-decoration:none;">
              ${escapeHtml(data.label || 'Bekijk meer')}
            </a>
          </td>
        </tr></table>
      </td></tr>
    </table>`
}

function reclameNaarHtml(reclame: ReclameInhoud): string {
  const afbeelding = reclame.pad
    ? `<img src="${afbeeldingUrl(reclame.pad)}" alt="${escapeHtml(reclame.titel)}" style="width:100%;display:block;border-radius:6px;margin:0 0 10px;" />`
    : ''
  const titelCss = tekstStijlCss(reclame.titelStijl ? { ...reclame.titelStijl, vet: reclame.titelStijl.vet ?? true } : { vet: true }, { grootte: 14 })
  const titel = reclame.titel ? `<div style="${titelCss}margin:0 0 4px;">${escapeHtml(reclame.titel)}</div>` : ''
  const tekstCss = tekstStijlCss(reclame.tekstStijl, { grootte: 13, regelafstandStandaard: 1.4, kleurStandaard: '#5B7A44' })
  const tekst = reclame.tekst ? `<div style="${tekstCss}">${tekstNaarHtml(reclame.tekst)}</div>` : ''
  const inhoud = `${afbeelding}${titel}${tekst}`
  const binnenkant = reclame.link ? `<a href="${escapeHtml(reclame.link)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:block;">${inhoud}</a>` : inhoud
  return `
    <div style="border:1px solid #D9EBC0;border-radius:10px;padding:14px;background:#FAFCF6;">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8AA86E;margin:0 0 8px;">Advertentie</div>
      ${binnenkant}
    </div>`
}

// Rendert de inhoud van één kant van een CombinatieBlok. maxBreedtePx is de
// geschatte beschikbare breedte (smaller bij horizontaal, vol bij verticaal)
// zodat afbeeldingen niet buiten hun kolom uitsteken op desktop-mailclients.
function knopOnderNaarHtml(knopOnder: KnopInhoud | undefined): string {
  if (!knopOnder || !knopOnder.url) return ''
  return `<div style="margin-top:12px;">${knopInhoudNaarHtml(knopOnder, 'left')}</div>`
}

function kolomNaarHtml(kolom: Kolom, maxBreedtePx: number): string {
  switch (kolom.soort) {
    case 'tekst': {
      const css = tekstStijlCss(kolom, { grootte: 14, regelafstandStandaard: 1.5 })
      const kopCss = tekstStijlCss({ vet: true, ...kolom.kopStijl }, { grootte: 18 })
      const kop = kolom.kop?.trim() ? `<div style="${kopCss}margin:0 0 8px;">${escapeHtml(kolom.kop)}</div>` : ''
      return `${kop}<div style="${css}">${tekstNaarHtml(kolom.tekst)}</div>${knopOnderNaarHtml(kolom.knopOnder)}`
    }
    case 'afbeelding':
      return `${afbeeldingInhoudNaarHtml(kolom, 'left', maxBreedtePx)}${knopOnderNaarHtml(kolom.knopOnder)}`
    case 'knop':
      return knopInhoudNaarHtml(kolom, 'left')
    case 'reclame':
      return reclameNaarHtml(kolom)
  }
}

function blokNaarHtml(blok: CampagneBlok, qrDataUrls: Record<string, string>): string {
  switch (blok.type) {
    case 'tekst': {
      const grootte = blok.tekstgrootte || 15
      const align = uitlijningNaarHtml(blok.uitlijning)
      const css = tekstStijlCss(blok, { grootte, regelafstandStandaard: 1.5 })
      const kopCss = tekstStijlCss({ vet: true, ...blok.kopStijl }, { grootte: 20 })
      const kop = blok.kop?.trim() ? `<div style="${kopCss}margin:0 0 8px;">${escapeHtml(blok.kop)}</div>` : ''
      return `<div style="text-align:${align};">${kop}<div style="${css}">${tekstNaarHtml(blok.tekst)}</div></div>`
    }

    case 'afbeelding': {
      const align = uitlijningNaarHtml(blok.uitlijning)
      const html = afbeeldingInhoudNaarHtml(blok, align, EMAIL_INHOUD_BREEDTE)
      return html ? `<div style="margin:0 0 16px;">${html}</div>` : ''
    }

    case 'knop': {
      const align = uitlijningNaarHtml(blok.uitlijning)
      const html = knopInhoudNaarHtml(blok, align)
      return html ? `<div style="margin:0 0 16px;">${html}</div>` : ''
    }

    case 'qr': {
      const dataUrl = qrDataUrls[blok.id]
      if (!dataUrl) return ''
      const grootte = blok.grootte ?? 160
      const align = uitlijningNaarHtml(blok.uitlijning ?? 'midden')
      const bijschriftCss = tekstStijlCss(blok.bijschriftStijl, { grootte: 12, kleurStandaard: '#5B7A44' })
      const bijschrift = blok.bijschrift ? `<p style="margin:8px 0 0;${bijschriftCss}">${escapeHtml(blok.bijschrift)}</p>` : ''
      return `<div style="margin:0 0 16px;text-align:${align};"><img src="${dataUrl}" alt="QR-code" width="${grootte}" height="${grootte}" style="display:inline-block;" />${bijschrift}</div>`
    }

    case 'reclame':
      return `<div style="margin:0 0 16px;">${reclameNaarHtml(blok)}</div>`

    case 'scheiding': {
      const hoogte = blok.hoogte ?? 24
      if (!blok.lijn) return `<div style="height:${hoogte}px;line-height:${hoogte}px;font-size:1px;">&nbsp;</div>`
      const dikte = blok.lijndikte ?? 1
      const helft = Math.max(0, Math.round((hoogte - dikte) / 2))
      return `
        <div style="height:${helft}px;line-height:${helft}px;font-size:1px;">&nbsp;</div>
        <div style="height:0;border-top:${dikte}px solid ${blok.lijnkleur || '#D9EBC0'};"></div>
        <div style="height:${Math.max(0, hoogte - helft - dikte)}px;line-height:${Math.max(0, hoogte - helft - dikte)}px;font-size:1px;">&nbsp;</div>`
    }

    case 'socials': {
      const align = uitlijningNaarHtml(blok.uitlijning ?? 'midden')
      const items = blok.links.filter(l => l.url.trim()).map(l => {
        const p = SOCIAL_PLATFORMS.find(p => p.waarde === l.platform)
        if (!p) return ''
        return `
          <td style="padding:0 6px;">
            <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;">
              <img src="${socialIconDataUri(p.waarde)}" width="36" height="36" alt="${escapeHtml(p.label)}" style="display:block;border-radius:50%;" />
            </a>
          </td>`
      }).join('')
      if (!items) return ''
      return `
        <table role="presentation" style="margin:0 0 16px;width:100%;" cellpadding="0" cellspacing="0">
          <tr><td align="${align}">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>${items}</tr></table>
          </td></tr>
        </table>`
    }

    case 'rij': {
      const horizontaal = (blok.richting ?? 'horizontaal') === 'horizontaal'
      if (!horizontaal) {
        return `
          <div style="margin:0 0 16px;">${kolomNaarHtml(blok.links, EMAIL_INHOUD_BREEDTE)}</div>
          <div style="margin:0 0 16px;">${kolomNaarHtml(blok.rechts, EMAIL_INHOUD_BREEDTE)}</div>`
      }
      const breedteEerste = blok.breedteEerste ?? 50
      const breedteTweede = 100 - breedteEerste
      const factor = EMAIL_INHOUD_BREEDTE / 100
      return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
          <tr>
            <td style="width:${breedteEerste}%;vertical-align:top;padding-right:10px;">${kolomNaarHtml(blok.links, Math.round(factor * breedteEerste))}</td>
            <td style="width:${breedteTweede}%;vertical-align:top;padding-left:10px;">${kolomNaarHtml(blok.rechts, Math.round(factor * breedteTweede))}</td>
          </tr>
        </table>`
    }
  }
}

// Zet een campagne om naar verzendklare HTML. qrDataUrls bevat per QR-blok-id
// een vooraf gegenereerde data-URL (zie CampagneBouwer) — deze functie
// genereert zelf geen QR-codes omdat dat async is. huisstijl is optioneel:
// zonder huisstijl wordt een neutrale kop/voet gebruikt.
export function campagneNaarHtml(
  campagne: Pick<Campagne, 'titel' | 'blokken'>,
  qrDataUrls: Record<string, string> = {},
  huisstijl?: CampagneHuisstijl | null,
): string {
  const inhoud = campagne.blokken.map(b => blokNaarHtml(b, qrDataUrls)).join('\n')
  const merkkleur = huisstijl?.merkkleur || STANDAARD_MERKKLEUR
  const achtergrond = huisstijl?.achtergrondkleur || STANDAARD_ACHTERGRONDKLEUR

  const kop = huisstijl?.logo_pad || huisstijl?.koptekst
    ? `<tr><td style="padding:24px ${EMAIL_PADDING}px 16px;text-align:center;border-bottom:3px solid ${merkkleur};">
        ${huisstijl.logo_pad ? `<img src="${logoUrl(huisstijl.logo_pad)}" alt="" style="max-height:56px;max-width:240px;display:inline-block;" />` : ''}
        ${huisstijl.koptekst ? `<div style="margin-top:8px;font-size:13px;color:#5B7A44;">${escapeHtml(huisstijl.koptekst)}</div>` : ''}
      </td></tr>`
    : ''

  const voet = huisstijl?.voettekst
    ? `<tr><td style="padding:20px ${EMAIL_PADDING}px;text-align:center;font-size:12px;color:#8AA86E;border-top:1px solid #EAF2DD;">
        ${escapeHtml(huisstijl.voettekst).replace(/\n/g, '<br/>')}
      </td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(campagne.titel)}</title>
</head>
<body style="margin:0;padding:0;background:${achtergrond};font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${achtergrond};padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="${EMAIL_BREEDTE}" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        ${kop}
        <tr><td style="padding:${EMAIL_PADDING}px;">
          ${inhoud}
        </td></tr>
        ${voet}
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function kolomHeeftInhoud(kolom: Kolom): boolean {
  switch (kolom.soort) {
    case 'tekst': return !!rijkeTekstNaarPlat(kolom.tekst) || !!kolom.kop?.trim()
    case 'afbeelding': return !!kolom.pad
    case 'knop': return !!kolom.label.trim() && !!kolom.url.trim()
    case 'reclame': return !!kolom.pad || !!kolom.titel.trim() || !!rijkeTekstNaarPlat(kolom.tekst)
  }
}

export function heeftBlokInhoud(blok: CampagneBlok): boolean {
  switch (blok.type) {
    case 'tekst': return !!rijkeTekstNaarPlat(blok.tekst) || !!blok.kop?.trim()
    case 'afbeelding': return !!blok.pad
    case 'knop': return !!blok.label.trim() && !!blok.url.trim()
    case 'qr': return !!blok.waarde.trim()
    case 'reclame': return !!blok.pad || !!blok.titel.trim() || !!rijkeTekstNaarPlat(blok.tekst)
    case 'scheiding': return true
    case 'socials': return blok.links.some(l => l.url.trim())
    case 'rij': return kolomHeeftInhoud(blok.links) || kolomHeeftInhoud(blok.rechts)
  }
}
