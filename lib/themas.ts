// Thema's zijn seizoensgebonden/feestdagen (Sinterklaas, Kerst, Lente, etc.)
// Kleuren voor thema-badges — volledig dynamisch uit de database

const FALLBACK_KLEUREN = [
  '#F59E0B','#EF4444','#8B5CF6','#06B6D4','#10B981',
  '#F97316','#6366F1','#EC4899','#14B8A6','#84CC16',
]
const FALLBACK_EMOJI = ['🎉','🎊','🌸','❄️','🎭','🌻','🎃','🎄','🎈','🌺']

export function getThemaKleur(thema: string): string {
  const idx = thema.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % FALLBACK_KLEUREN.length
  return FALLBACK_KLEUREN[idx]
}

export function getThemaEmoji(thema: string): string {
  const bekende: Record<string, string> = {
    sinterklaas: '🎅', kerst: '🎄', halloween: '🎃', pasen: '🐣',
    lente: '🌸', zomer: '☀️', herfst: '🍂', winter: '❄️',
    carnaval: '🎭', koningsdag: '🧡', oud: '🎆', nieuw: '🎆',
    valentijn: '❤️', moederdag: '💐', vaderdag: '👔',
  }
  const key = thema.toLowerCase()
  for (const [k, v] of Object.entries(bekende)) {
    if (key.includes(k)) return v
  }
  const idx = thema.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % FALLBACK_EMOJI.length
  return FALLBACK_EMOJI[idx]
}

export function getThemaTagClass(): string {
  return 'tag-amber'
}

export const ALLE_THEMAS: string[] = []
