'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Topbar from '@/components/Topbar'
import { Search, X, ChevronUp, ChevronDown, Download, BookOpen, Lightbulb, Info } from 'lucide-react'
import {
  HOOFDSTUKKEN,
  HANDLEIDING_INLEIDING,
  HANDLEIDING_SLOT,
  HANDLEIDING_VERSIE,
  normaliseer,
  telTreffers,
  type Blok,
  type Hoofdstuk,
} from '@/lib/handleiding'

const PDF_PAD = '/handleiding-medewerkers.pdf'

// ─── Zoekmarkering ────────────────────────────────────────────────────────────

/** Teller die tijdens één render de treffers doornummert, zodat we kunnen springen. */
interface Teller { n: number }

/**
 * Kleine letters zonder accenten, mét een tabel die elke positie terugvertaalt
 * naar de originele tekst — anders lopen de indexen scheef bij é, ë en ─.
 */
function normaliseerMetPosities(tekst: string): { laag: string; posities: number[] } {
  let laag = ''
  const posities: number[] = []
  for (let i = 0; i < tekst.length; i++) {
    const genormaliseerd = normaliseer(tekst[i])
    for (let j = 0; j < genormaliseerd.length; j++) {
      laag += genormaliseerd[j]
      posities.push(i)
    }
  }
  posities.push(tekst.length)
  return { laag, posities }
}

/** Zet elke vondst van de zoekterm om in een <mark> met een volgnummer. */
function highlight(tekst: string, naald: string, teller: Teller, actief: number): React.ReactNode {
  if (!naald) return tekst

  const { laag, posities } = normaliseerMetPosities(tekst)
  const delen: React.ReactNode[] = []
  let vanaf = 0
  let key = 0

  for (;;) {
    const i = laag.indexOf(naald, vanaf)
    if (i === -1) break
    const start = posities[i]
    const eind = posities[i + naald.length]
    if (start > posities[vanaf]) delen.push(tekst.slice(posities[vanaf], start))
    const nummer = teller.n++
    const isActief = nummer === actief
    delen.push(
      <mark
        key={key++}
        data-treffer={nummer}
        style={{
          background: isActief ? 'var(--primary)' : 'rgba(140, 198, 63, 0.32)',
          color: isActief ? '#0F1A08' : 'inherit',
          borderRadius: 3,
          padding: '1px 1px',
          scrollMarginTop: 90,
        }}
      >
        {tekst.slice(start, eind)}
      </mark>
    )
    vanaf = i + naald.length
  }

  if (delen.length === 0) return tekst
  delen.push(tekst.slice(posities[vanaf]))
  return delen
}

/** Splitst **vet** uit de tekst en markeert de zoekterm binnen elk stuk. */
function tekstMetOpmaak(tekst: string, naald: string, teller: Teller, actief: number): React.ReactNode {
  const delen: React.ReactNode[] = []
  const regex = /\*\*(.+?)\*\*/g
  let laatste = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = regex.exec(tekst)) !== null) {
    if (match.index > laatste) {
      delen.push(
        <React.Fragment key={key++}>{highlight(tekst.slice(laatste, match.index), naald, teller, actief)}</React.Fragment>
      )
    }
    delen.push(<b key={key++}>{highlight(match[1], naald, teller, actief)}</b>)
    laatste = match.index + match[0].length
  }
  if (laatste < tekst.length) {
    delen.push(<React.Fragment key={key++}>{highlight(tekst.slice(laatste), naald, teller, actief)}</React.Fragment>)
  }
  return delen
}

// ─── Blokken ──────────────────────────────────────────────────────────────────

function BlokWeergave({ blok, naald, teller, actief }: { blok: Blok; naald: string; teller: Teller; actief: number }) {
  const tk = (t: string) => tekstMetOpmaak(t, naald, teller, actief)

  if (blok.soort === 'kaarten') {
    return (
      <div className="grid-2col" style={{ marginTop: 14 }}>
        {blok.kaarten.map((kaart, i) => (
          <div
            key={i}
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{tk(kaart.titel)}</div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-muted)', margin: 0 }}>{tk(kaart.tekst)}</p>
          </div>
        ))}
      </div>
    )
  }

  if (blok.soort === 'stappen') {
    return (
      <div
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '16px 18px',
          marginTop: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 13,
          }}
        >
          {tk(blok.kop)}
        </div>

        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {blok.stappen.map((stap, i) => (
            <li key={i} style={{ display: 'flex', gap: 11, marginBottom: i === blok.stappen.length - 1 ? 0 : 10 }}>
              <span
                style={{
                  flexShrink: 0,
                  width: 21,
                  height: 21,
                  borderRadius: '50%',
                  background: 'var(--primary-light)',
                  color: 'var(--primary-text)',
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 1,
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text)' }}>{tk(stap)}</span>
            </li>
          ))}
        </ol>

        {blok.chips && blok.chips.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            {blok.chips.map((chip, i) => (
              <span key={i} className="tag tag-green" style={{ borderRadius: 999 }}>
                {tk(chip)}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (blok.soort === 'uitleg' || blok.soort === 'weetje') {
    const isWeetje = blok.soort === 'weetje'
    return (
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          background: isWeetje ? 'rgba(186, 117, 23, 0.10)' : 'var(--primary-light)',
          borderLeft: `3px solid ${isWeetje ? 'var(--warning)' : 'var(--primary)'}`,
          borderRadius: 10,
          padding: '13px 16px',
          marginTop: 12,
        }}
      >
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          {isWeetje ? <Lightbulb size={16} color="var(--warning)" /> : <Info size={16} color="var(--primary-text)" />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: isWeetje ? 'var(--warning)' : 'var(--primary-text)',
              marginBottom: 4,
            }}
          >
            {tk(blok.label)}
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)', margin: 0 }}>{tk(blok.tekst)}</p>
        </div>
      </div>
    )
  }

  // definities
  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 10,
        }}
      >
        {tk(blok.kop)}
      </div>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '4px 18px' }}>
        {blok.rijen.map((rij, i) => (
          <div
            key={i}
            className="layout-split layout-split-sm"
            style={{
              gap: 12,
              padding: '11px 0',
              borderTop: i === 0 ? 'none' : '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{tk(rij.naam)}</div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-muted)', margin: 0 }}>{tk(rij.tekst)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Hoofdstuk ────────────────────────────────────────────────────────────────

function HoofdstukWeergave({
  hoofdstuk,
  naald,
  teller,
  actief,
}: {
  hoofdstuk: Hoofdstuk
  naald: string
  teller: Teller
  actief: number
}) {
  const tk = (t: string) => tekstMetOpmaak(t, naald, teller, actief)

  return (
    <section id={`hs-${hoofdstuk.id}`} className="card" style={{ padding: '22px 24px', scrollMarginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            flexShrink: 0,
            minWidth: 30,
            height: 30,
            padding: '0 7px',
            borderRadius: 9,
            background: hoofdstuk.nummer ? 'var(--primary)' : 'var(--primary-light)',
            color: hoofdstuk.nummer ? '#fff' : 'var(--primary-text)',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {hoofdstuk.nummer || <BookOpen size={15} />}
        </div>
        <h2 style={{ fontSize: 19, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{tk(hoofdstuk.titel)}</h2>
      </div>

      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-muted)', margin: '10px 0 0' }}>{tk(hoofdstuk.intro)}</p>

      {hoofdstuk.blokken.map((blok, i) => (
        <BlokWeergave key={i} blok={blok} naald={naald} teller={teller} actief={actief} />
      ))}
    </section>
  )
}

// ─── Pagina ───────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const [zoekterm, setZoekterm] = useState('')
  const [actief, setActief] = useState(0)
  const [aantalTreffers, setAantalTreffers] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const naald = normaliseer(zoekterm.trim())

  // Treffers per hoofdstuk — voor de inhoudsopgave en om te filteren
  const trefferPerHoofdstuk = useMemo(() => {
    const kaart: Record<string, number> = {}
    for (const h of HOOFDSTUKKEN) kaart[h.id] = naald ? telTreffers(h, zoekterm.trim()) : 0
    return kaart
  }, [zoekterm, naald])

  const zichtbaar = naald ? HOOFDSTUKKEN.filter((h) => trefferPerHoofdstuk[h.id] > 0) : HOOFDSTUKKEN

  // Na elke zoekactie: tel de gemarkeerde treffers en spring naar de actieve
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const marks = container.querySelectorAll('mark[data-treffer]')
    setAantalTreffers(marks.length)
    if (marks.length === 0) return
    const doel = marks[Math.min(actief, marks.length - 1)] as HTMLElement | undefined
    doel?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [zoekterm, actief])

  function springNaar(richting: 1 | -1) {
    if (aantalTreffers === 0) return
    setActief((huidig) => (huidig + richting + aantalTreffers) % aantalTreffers)
  }

  function naarHoofdstuk(id: string) {
    document.getElementById(`hs-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Ctrl/Cmd+F opent de zoekbalk van de handleiding in plaats van die van de browser
  useEffect(() => {
    function opToets(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', opToets)
    return () => window.removeEventListener('keydown', opToets)
  }, [])

  // Doorlopende nummering van de treffers tijdens deze render
  const teller: Teller = { n: 0 }

  return (
    <>
      <Topbar
        titel="Support"
        subtitel="Gebruikershandleiding voor medewerkers"
        acties={
          <a href={PDF_PAD} download className="btn" style={{ textDecoration: 'none' }}>
            <Download size={14} />
            PDF downloaden
          </a>
        }
      />

      <div ref={scrollRef} className="page-content">
        {/* ── Zoeken in de handleiding ───────────────────────────────────────── */}
        <div className="support-zoekbalk">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '8px 12px',
            }}
          >
            <Search size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={zoekterm}
              onChange={(e) => {
                setZoekterm(e.target.value)
                setActief(0)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); springNaar(e.shiftKey ? -1 : 1) }
                if (e.key === 'Escape') { setZoekterm(''); setActief(0) }
              }}
              placeholder="Zoek in de handleiding — bijvoorbeeld: bonnetje, allergie, prioriteit"
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'var(--text)',
                fontSize: 14,
                fontFamily: 'inherit',
              }}
            />

            {zoekterm.trim() && (
              <>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {aantalTreffers === 0 ? 'geen resultaten' : `${Math.min(actief + 1, aantalTreffers)} / ${aantalTreffers}`}
                </span>
                <button
                  onClick={() => springNaar(-1)}
                  disabled={aantalTreffers === 0}
                  title="Vorige treffer (Shift + Enter)"
                  style={knopStijl(aantalTreffers === 0)}
                >
                  <ChevronUp size={15} />
                </button>
                <button
                  onClick={() => springNaar(1)}
                  disabled={aantalTreffers === 0}
                  title="Volgende treffer (Enter)"
                  style={knopStijl(aantalTreffers === 0)}
                >
                  <ChevronDown size={15} />
                </button>
                <button onClick={() => { setZoekterm(''); setActief(0) }} title="Zoeken wissen" style={knopStijl(false)}>
                  <X size={15} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="layout-split layout-split-md">
          {/* ── Inhoudsopgave ────────────────────────────────────────────────── */}
          <div>
            <div className="card support-inhoud" style={{ padding: '14px 12px' }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  padding: '0 8px',
                  marginBottom: 10,
                }}
              >
                Inhoud
              </div>

              {zichtbaar.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '0 8px', margin: 0 }}>
                  Geen hoofdstuk met deze zoekterm.
                </p>
              )}

              {zichtbaar.map((h) => (
                <button
                  key={h.id}
                  onClick={() => naarHoofdstuk(h.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 8px',
                    borderRadius: 8,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text)',
                    fontSize: 13,
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-xlight)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ width: 26, flexShrink: 0, fontSize: 11, color: 'var(--primary-text)', fontWeight: 600 }}>
                    {h.nummer || '—'}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>{h.titel}</span>
                  {naald && <span className="nav-badge">{trefferPerHoofdstuk[h.id]}</span>}
                </button>
              ))}

              <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0 0', padding: '10px 8px 0' }}>
                <a
                  href={PDF_PAD}
                  download
                  style={{ fontSize: 12, color: 'var(--primary-text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={13} />
                  Handleiding als PDF
                </a>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{HANDLEIDING_VERSIE}</div>
              </div>
            </div>
          </div>

          {/* ── Document ─────────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            {!naald && (
              <div className="card" style={{ padding: '22px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--primary-text)' }}>
                  De Theepot Kinderopvang — Dashboard
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '10px 0 12px' }}>
                  Handleiding voor medewerkers
                </h1>
                <div style={{ width: 48, height: 4, borderRadius: 2, background: 'var(--primary)', marginBottom: 14 }} />
                <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-muted)', margin: 0, maxWidth: 620 }}>
                  {HANDLEIDING_INLEIDING}
                </p>
              </div>
            )}

            {zichtbaar.length === 0 ? (
              <div className="empty-state">
                <Search size={40} />
                <h3>Niets gevonden</h3>
                <p>Geen enkel hoofdstuk bevat &ldquo;{zoekterm.trim()}&rdquo;. Probeer een ander woord.</p>
              </div>
            ) : (
              zichtbaar.map((h) => (
                <HoofdstukWeergave key={h.id} hoofdstuk={h} naald={naald} teller={teller} actief={actief} />
              ))
            )}

            {!naald && (
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 8px', padding: '0 4px' }}>
                {HANDLEIDING_SLOT}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function knopStijl(uit: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
    flexShrink: 0,
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: uit ? 'var(--border-dark)' : 'var(--text-muted)',
    cursor: uit ? 'default' : 'pointer',
  }
}
