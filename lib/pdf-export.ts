import { Activiteit } from './supabase'

export async function exportActiviteitAlsPDF(activiteit: Activiteit) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const blauw = [140, 198, 63] as [number, number, number]
  const tekstDonker = [17, 24, 39] as [number, number, number]
  const tekstGrijs = [107, 114, 128] as [number, number, number]
  const wit = [255, 255, 255] as [number, number, number]

  const marge = 20
  const breedte = 210 - marge * 2
  let y = 0

  // ── Header balk ──────────────────────────────────────────────
  doc.setFillColor(...blauw)
  doc.rect(0, 0, 210, 18, 'F')
  doc.setTextColor(...wit)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('De Theepot — Activiteiten', marge, 11)
  doc.text(new Date().toLocaleDateString('nl-NL'), 210 - marge, 11, { align: 'right' })

  y = 32

  // ── Titel ─────────────────────────────────────────────────────
  doc.setTextColor(...tekstDonker)
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  const titelRegels = doc.splitTextToSize(activiteit.naam, breedte)
  doc.text(titelRegels, marge, y)
  y += titelRegels.length * 10 + 8

  // Dunne scheidingslijn onder titel
  doc.setDrawColor(...blauw)
  doc.setLineWidth(0.6)
  doc.line(marge, y, 210 - marge, y)
  y += 10

  // ── Beschrijving ──────────────────────────────────────────────
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...tekstDonker)
  const beschRegels = doc.splitTextToSize(activiteit.beschrijving, breedte)
  doc.text(beschRegels, marge, y)
  y += beschRegels.length * 6 + 6

  // ── Stappen ───────────────────────────────────────────────────
  if (activiteit.stappen.length > 0) {
    y += 2
    activiteit.stappen.forEach((stap, i) => {
      if (y > 260) { doc.addPage(); y = 20 }

      // Nummercirkel
      doc.setFillColor(...blauw)
      doc.circle(marge + 4, y - 1.5, 4, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...wit)
      doc.text(String(i + 1), marge + 4, y - 0.2, { align: 'center' })

      // Staptekst
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...tekstDonker)
      const stapRegels = doc.splitTextToSize(stap, breedte - 12)
      doc.text(stapRegels, marge + 11, y)
      y += stapRegels.length * 6 + 4
    })
    y += 4
  }

  // ── Benodigdheden ─────────────────────────────────────────────
  if (activiteit.materialen.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...tekstDonker)
    doc.text('Benodigdheden', marge, y)
    y += 8

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    activiteit.materialen.forEach(mat => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(`• ${mat}`, marge + 3, y)
      y += 7
    })
  }

  // ── Footer ────────────────────────────────────────────────────
  const aantalPaginas = doc.getNumberOfPages()
  for (let p = 1; p <= aantalPaginas; p++) {
    doc.setPage(p)
    doc.setFillColor(245, 247, 250)
    doc.rect(0, 284, 210, 13, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...tekstGrijs)
    doc.text('De Theepot — Activiteiten Bibliotheek', marge, 291)
    doc.text(`${p} / ${aantalPaginas}`, 210 - marge, 291, { align: 'right' })
  }

  doc.save(`${activiteit.naam.replace(/\s+/g, '_')}.pdf`)
}
