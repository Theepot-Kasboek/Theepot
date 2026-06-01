// Vaste categorieën met kleuren en emoji's
export const CATEGORIE_KLEUREN: Record<string, string> = {
  Natuur: '#16A34A',
  Creatief: '#7C3AED',
  Beweging: '#DC2626',
  Koken: '#D97706',
  Muziek: '#0891B2',
  Taal: '#059669',
  Wetenschap: '#4338CA',
  Drama: '#BE185D',
  Sport: '#EA580C',
  Techniek: '#0369A1',
  Samenwerking: '#65A30D',
  Ontspanning: '#6B7280',
  Kunst: '#9333EA',
  Avontuur: '#B45309',
}

export const CATEGORIE_EMOJI: Record<string, string> = {
  Natuur: '🌿',
  Creatief: '🎨',
  Beweging: '🏃',
  Koken: '🍳',
  Muziek: '🎵',
  Taal: '📖',
  Wetenschap: '🔬',
  Drama: '🎭',
  Sport: '⚽',
  Techniek: '🔧',
  Samenwerking: '🤝',
  Ontspanning: '😌',
  Kunst: '🖼️',
  Avontuur: '🗺️',
}

export const ALLE_CATEGORIEEN = Object.keys(CATEGORIE_KLEUREN)

export function getCategorieKleur(cat: string): string {
  if (CATEGORIE_KLEUREN[cat]) return CATEGORIE_KLEUREN[cat]
  const fallback = ['#2563EB','#7C3AED','#DB2777','#059669','#D97706','#DC2626','#0891B2']
  const idx = cat.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % fallback.length
  return fallback[idx]
}

export function getCategorieEmoji(cat: string): string {
  if (CATEGORIE_EMOJI[cat]) return CATEGORIE_EMOJI[cat]
  const fallback = ['✨','🌟','💡','🎯','🚀','🌈','💫']
  const idx = cat.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % fallback.length
  return fallback[idx]
}

export function getCategorieTagClass(cat: string): string {
  const klassen: Record<string, string> = {
    Natuur: 'tag-green', Creatief: 'tag-purple', Beweging: 'tag-red',
    Koken: 'tag-amber', Muziek: 'tag-cyan', Taal: 'tag-teal', Wetenschap: 'tag-indigo',
  }
  return klassen[cat] || 'tag-blue'
}
