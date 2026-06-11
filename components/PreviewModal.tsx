'use client'
import { useState, useEffect } from 'react'
import { X, Download, ExternalLink } from 'lucide-react'

interface Props {
  titel: string
  // Geef óf een URL óf HTML inhoud
  url?: string
  html?: string
  bestandsNaam?: string
  onClose: () => void
  onDownload?: () => void
}

export default function PreviewModal({ titel, url, html, bestandsNaam, onClose, onDownload }: Props) {
  const [laden, setLaden] = useState(true)
  const isPDF = url?.toLowerCase().includes('.pdf') || bestandsNaam?.toLowerCase().endsWith('.pdf')
  const isWord = bestandsNaam?.match(/\.(doc|docx)$/i)

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', flexDirection: 'column' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Header balk */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontWeight: 600, fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titel}</span>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ textDecoration: 'none' }}>
              <ExternalLink size={13} /> Openen
            </a>
          )}
          {onDownload && (
            <button className="btn btn-sm btn-primary" onClick={onDownload}>
              <Download size={13} /> Downloaden
            </button>
          )}
          <button onClick={onClose} className="btn btn-sm" style={{ color: 'var(--text-muted)' }}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Preview inhoud */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#525659' }}>
        {laden && !html && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
            Laden...
          </div>
        )}

        {/* HTML preview */}
        {html && (
          <iframe
            srcDoc={html}
            style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
            onLoad={() => setLaden(false)}
            title={titel}
          />
        )}

        {/* PDF preview */}
        {url && isPDF && (
          <iframe
            src={url + '#toolbar=0&navpanes=0'}
            style={{ width: '100%', height: '100%', border: 'none' }}
            onLoad={() => setLaden(false)}
            title={titel}
          />
        )}

        {/* Word document — niet previewbaar, toon melding */}
        {isWord && !html && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: '#fff' }}>
            <div style={{ fontSize: 48 }}>📄</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{bestandsNaam}</div>
            <div style={{ fontSize: 13, opacity: 0.7, textAlign: 'center', maxWidth: 360 }}>
              Word documenten kunnen niet worden voorvertoond in de browser.<br />Download het bestand om het te bekijken.
            </div>
            {onDownload && (
              <button className="btn btn-primary" onClick={onDownload}>
                <Download size={14} /> Downloaden
              </button>
            )}
          </div>
        )}

        {/* Overige bestanden */}
        {url && !isPDF && !isWord && !html && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: '#fff' }}>
            <div style={{ fontSize: 48 }}>📎</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{bestandsNaam ?? titel}</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>Dit bestandstype kan niet worden voorvertoond.</div>
            {onDownload && (
              <button className="btn btn-primary" onClick={onDownload}>
                <Download size={14} /> Downloaden
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
