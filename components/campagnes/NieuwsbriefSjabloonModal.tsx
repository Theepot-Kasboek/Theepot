'use client'

import { useState } from 'react'
import { Type, Image as ImageIcon, Link2, QrCode, Megaphone, Columns2, SeparatorHorizontal, Share2, X } from 'lucide-react'
import { CampagneBlok } from '@/lib/campagnes'

interface Props {
  blokken: CampagneBlok[]
  onOpslaan: (naam: string, bewarenIds: Set<string>) => void
  onSluiten: () => void
  opslaan: boolean
}

const ICOON: Record<CampagneBlok['type'], typeof Type> = {
  tekst: Type, afbeelding: ImageIcon, knop: Link2, qr: QrCode, reclame: Megaphone,
  scheiding: SeparatorHorizontal, socials: Share2, rij: Columns2,
}

function blokLabel(blok: CampagneBlok): string {
  switch (blok.type) {
    case 'tekst': return blok.tekst.trim() ? `Tekst: "${blok.tekst.trim().slice(0, 40)}${blok.tekst.trim().length > 40 ? '…' : ''}"` : 'Tekst (leeg)'
    case 'afbeelding': return blok.bijschrift ? `Afbeelding: ${blok.bijschrift}` : 'Afbeelding'
    case 'knop': return blok.label ? `Knop: "${blok.label}"` : 'Knop'
    case 'qr': return 'QR-code'
    case 'reclame': return blok.titel ? `Reclame: ${blok.titel}` : 'Reclame'
    case 'scheiding': return 'Scheiding'
    case 'socials': return `Social media (${blok.links.length})`
    case 'rij': return `Combinatieblok (${blok.links.soort} + ${blok.rechts.soort})`
  }
}

export default function NieuwsbriefSjabloonModal({ blokken, onOpslaan, onSluiten, opslaan }: Props) {
  const [naam, setNaam] = useState('')
  const [bewaren, setBewaren] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setBewaren(prev => {
      const nieuw = new Set(prev)
      if (nieuw.has(id)) nieuw.delete(id); else nieuw.add(id)
      return nieuw
    })
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onSluiten() }}>
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="card-title">Opslaan als nieuwsbriefsjabloon</span>
          <button className="btn btn-sm" onClick={onSluiten}><X size={14} /></button>
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Naam van het sjabloon</label>
            <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Bijv. Maandelijkse nieuwsbrief" autoFocus />
          </div>

          <div>
            <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>Kies per blok of de ingevulde inhoud bewaard blijft, of leeggemaakt wordt zodat je &apos;m later opnieuw invult.</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>De opmaak (lettertype, kleuren, uitlijning, lay-out) blijft bij alle blokken altijd behouden.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {blokken.map(blok => {
                const Icoon = ICOON[blok.type]
                const bewaardit = bewaren.has(blok.id)
                return (
                  <label key={blok.id} onClick={() => toggle(blok.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, border: `1px solid ${bewaardit ? '#8CC63F' : 'var(--border)'}`, background: bewaardit ? '#EBF5D6' : 'transparent', cursor: 'pointer' }}>
                    <Icoon size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{blokLabel(blok)}</span>
                    <input type="checkbox" checked={bewaardit} onChange={() => toggle(blok.id)} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 64, flexShrink: 0 }}>{bewaardit ? 'Bewaren' : 'Leegmaken'}</span>
                  </label>
                )
              })}
              {blokken.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Geen blokken om op te slaan.</p>}
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
          <button className="btn" onClick={onSluiten}>Annuleren</button>
          <button className="btn btn-primary" onClick={() => onOpslaan(naam.trim(), bewaren)} disabled={!naam.trim() || opslaan || blokken.length === 0} style={{ flex: 1 }}>
            {opslaan ? 'Opslaan...' : 'Sjabloon opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}
