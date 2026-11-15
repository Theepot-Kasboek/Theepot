'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface PubliekEvenement {
  titel: string
  omschrijving: string | null
  locatie: string | null
  datum: string | null
  status: 'actief' | 'geannuleerd'
  vol: boolean
  gesloten: boolean
}

export default function EvenementAanmeldenPubliekePagina() {
  const params = useParams()
  const evenementId = params?.id as string

  const [laden, setLaden] = useState(true)
  const [evenement, setEvenement] = useState<PubliekEvenement | null>(null)
  const [nietGevonden, setNietGevonden] = useState(false)

  const [form, setForm] = useState({ naam: '', email: '' })
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [verzonden, setVerzonden] = useState<'nieuw' | 'al_aangemeld' | null>(null)

  useEffect(() => {
    if (!evenementId) return
    async function laad() {
      const res = await fetch(`/api/evenementen/aanmelden?evenement_id=${evenementId}`)
      if (!res.ok) { setNietGevonden(true); setLaden(false); return }
      const json = await res.json()
      setEvenement(json)
      setLaden(false)
    }
    laad()
  }, [evenementId])

  async function versturen() {
    if (!evenement) return
    if (!form.email.trim()) {
      setFout('Vul je e-mailadres in.')
      return
    }
    setBezig(true)
    setFout(null)
    try {
      const res = await fetch('/api/evenementen/aanmelden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evenement_id: evenementId,
          email: form.email.trim(),
          naam: form.naam.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setFout(json.error ?? 'Er ging iets mis, probeer het later opnieuw.')
        return
      }
      setVerzonden(json.al_aangemeld ? 'al_aangemeld' : 'nieuw')
    } catch {
      setFout('Er ging iets mis, probeer het later opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  if (laden) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F9EC' }}>
        <p style={{ color: '#3D6B1A', fontSize: 14 }}>Laden…</p>
      </div>
    )
  }

  if (nietGevonden || !evenement) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F9EC', padding: 20 }}>
        <p style={{ color: '#3D6B1A', fontSize: 15 }}>Deze pagina bestaat niet.</p>
      </div>
    )
  }

  const gesloten = evenement.status !== 'actief' || evenement.gesloten
  const vol = !gesloten && evenement.vol

  return (
    <div style={{ minHeight: '100vh', background: '#F4F9EC', padding: '40px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{ color: '#5B8A2A', fontSize: 13, marginBottom: 4 }}>De Theepot Kinderopvang</p>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 700, color: '#2E5513', margin: 0 }}>
            {evenement.titel}
          </h1>
          {(evenement.datum || evenement.locatie) && (
            <p style={{ color: '#4C7A20', fontSize: 14, marginTop: 6 }}>
              {evenement.datum ? new Date(evenement.datum).toLocaleString('nl-NL', { dateStyle: 'long', timeStyle: 'short' }) : ''}
              {evenement.datum && evenement.locatie ? ' · ' : ''}
              {evenement.locatie ?? ''}
            </p>
          )}
          {evenement.omschrijving && (
            <p style={{ color: '#4C7A20', fontSize: 14, marginTop: 10, whiteSpace: 'pre-wrap' }}>{evenement.omschrijving}</p>
          )}
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #D9EBC0', padding: 28, boxShadow: '0 2px 12px rgba(61,107,26,0.08)' }}>
          {gesloten ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2E5513', margin: '0 0 8px' }}>Aanmelden is gesloten</h2>
              <p style={{ fontSize: 14, color: '#4C7A20', margin: 0 }}>Je kunt je niet meer aanmelden voor dit evenement.</p>
            </div>
          ) : vol ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2E5513', margin: '0 0 8px' }}>Dit evenement is vol</h2>
              <p style={{ fontSize: 14, color: '#4C7A20', margin: 0 }}>Er zijn helaas geen plekken meer beschikbaar.</p>
            </div>
          ) : verzonden ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2E5513', margin: '0 0 8px' }}>
                {verzonden === 'al_aangemeld' ? 'Aanmelding bijgewerkt' : 'Aanmelding gelukt'}
              </h2>
              <p style={{ fontSize: 14, color: '#4C7A20', margin: 0 }}>
                {verzonden === 'al_aangemeld'
                  ? 'Je gegevens zijn bijgewerkt. Je staat al op de lijst voor dit evenement.'
                  : 'Bedankt voor je aanmelding. Je staat nu op de lijst voor dit evenement.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4C7A20', marginBottom: 6 }}>Naam</label>
                <input
                  value={form.naam}
                  onChange={e => setForm(f => ({ ...f, naam: e.target.value }))}
                  placeholder="Voor- en achternaam (optioneel)"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #CBE6A6', fontSize: 15 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4C7A20', marginBottom: 6 }}>E-mail *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="naam@voorbeeld.nl"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #CBE6A6', fontSize: 15 }}
                />
              </div>

              {fout && (
                <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#991B1B' }}>
                  ⚠️ {fout}
                </div>
              )}

              <button
                onClick={versturen}
                disabled={bezig}
                style={{
                  padding: 15, borderRadius: 10, border: 'none',
                  background: '#3D6B1A', color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: bezig ? 'not-allowed' : 'pointer', opacity: bezig ? 0.6 : 1,
                }}
              >{bezig ? 'Aanmelden…' : 'Aanmelden'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
