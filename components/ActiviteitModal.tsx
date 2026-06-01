'use client'
import { X, Copy, Download, Edit2, Trash2 } from 'lucide-react'
import { Activiteit } from '@/lib/supabase'
import { exportActiviteitAlsPDF } from '@/lib/pdf-export'
import { getCategorieKleur, getCategorieEmoji } from '@/lib/categorieen'
import { getThemaEmoji } from '@/lib/themas'
import { useState } from 'react'

interface Props {
  activiteit: Activiteit
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onToast: (msg: string) => void
}

function maakKopieerTekst(a: Activiteit): string {
  const regels: string[] = [a.naam, '']
  if (a.beschrijving) { regels.push(a.beschrijving); regels.push('') }
  if (a.stappen.length > 0) { a.stappen.forEach((s, i) => regels.push(`${i + 1}. ${s}`)); regels.push('') }
  if (a.materialen.length > 0) { regels.push('Benodigdheden'); a.materialen.forEach(m => regels.push(`• ${m}`)) }
  return regels.join('\n')
}

export default function ActiviteitModal({ activiteit, onClose, onEdit, onDelete, onToast }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [bevestigVerwijder, setBevestigVerwijder] = useState(false)

  function kopieer() {
    navigator.clipboard.writeText(maakKopieerTekst(activiteit))
    onToast('✅ Gekopieerd!')
  }

  async function handlePDF() {
    setPdfLoading(true)
    try { await exportActiviteitAlsPDF(activiteit); onToast('📄 PDF geëxporteerd!') }
    catch { onToast('⚠️ PDF export mislukt') }
    setPdfLoading(false)
  }

  const catKleur = getCategorieKleur(activiteit.categorie)
  const catEmoji = getCategorieEmoji(activiteit.categorie)
  const themaEmoji = getThemaEmoji(activiteit.thema)

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box">
        <div style={{ height: 5, background: catKleur, borderRadius: '16px 16px 0 0' }} />

        <div style={{ padding: '24px 28px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
                {activiteit.naam}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: catKleur + '18', color: catKleur, border: `1px solid ${catKleur}40` }}>{catEmoji} {activiteit.categorie}</span>
                {activiteit.thema && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>{themaEmoji} {activiteit.thema}</span>}
                <span className="tag" style={{ background: '#F8FAFC', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>👶 {activiteit.leeftijd}</span>
                <span className="tag" style={{ background: '#F8FAFC', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>⏱ {activiteit.tijdsduur} min</span>
                <span className="tag" style={{ background: '#F8FAFC', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>👥 {activiteit.groepsgrootte}</span>
                {activiteit.materiaal_aanwezig && <span className="tag tag-green">✅ Beschikbaar</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border-dark)', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, margin: '16px 0 0', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={kopieer}><Copy size={13} /> Kopiëren</button>
            <button className="btn btn-sm" onClick={handlePDF} disabled={pdfLoading}><Download size={13} /> {pdfLoading ? 'Laden...' : 'Export PDF'}</button>
            <button className="btn btn-sm" onClick={onEdit}><Edit2 size={13} /> Bewerken</button>
            <div style={{ marginLeft: 'auto' }}>
              {!bevestigVerwijder ? (
                <button className="btn btn-sm" onClick={() => setBevestigVerwijder(true)} style={{ color: '#DC2626', borderColor: '#FECACA' }}>
                  <Trash2 size={13} /> Verwijderen
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, padding: '6px 12px' }}>
                  <span style={{ fontSize: 12.5, color: '#991B1B', fontWeight: 500 }}>Zeker weten?</span>
                  <button className="btn btn-sm" onClick={onDelete} style={{ background: '#DC2626', color: '#fff', borderColor: '#DC2626', padding: '4px 10px' }}>Ja, verwijder</button>
                  <button className="btn btn-sm" onClick={() => setBevestigVerwijder(false)} style={{ padding: '4px 10px' }}>Annuleer</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ margin: '16px 28px 0', borderTop: '1px solid var(--border)' }} />

        <div style={{ padding: '20px 28px 28px' }}>
          {activiteit.beschrijving && (
            <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, marginBottom: activiteit.stappen.length > 0 ? 20 : 24 }}>
              {activiteit.beschrijving}
            </p>
          )}
          {activiteit.stappen.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              {activiteit.stappen.map((stap, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                  <div style={{ minWidth: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.65, paddingTop: 3 }}>{stap}</p>
                </div>
              ))}
            </div>
          )}
          {activiteit.materialen.length > 0 && (
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Benodigdheden</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {activiteit.materialen.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text)' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 16 }}>•</span>{m}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
