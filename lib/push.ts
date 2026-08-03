import type { SupabaseClient } from '@supabase/supabase-js'
import { verstuurApns } from './push-apns'
import { verstuurFcm } from './push-fcm'

// Generieke pushlaag: chat is de eerste afnemer, maar prikbord/agenda kunnen
// hier later op aanhaken zonder rebuild (alleen `type` erbij en een nieuwe caller).

interface PushApparaat {
  id: string
  profiel_id: string
  token: string
  platform: 'ios' | 'android'
  omgeving: 'sandbox' | 'productie'
  bundel_id: string | null
}

export interface VerstuurPushOpties {
  type: 'chat' | 'prikbord' | 'agenda'
  profielIds: string[]
  titel: string
  body: string
  data?: Record<string, string>
  /** Badge-aantal per profiel (bv. ongelezen chatberichten). Alleen relevant voor iOS. */
  badgePerProfiel?: Record<string, number>
  /** Voor collapse-gedrag (apns-collapse-id / android.notification.tag). */
  collapseId?: string
}

function tokenStaart(token: string): string {
  return token.slice(-8)
}

export async function verstuurPush(supabase: SupabaseClient, opties: VerstuurPushOpties): Promise<void> {
  const { data: apparaten } = await supabase
    .from('push_apparaten')
    .select('id, profiel_id, token, platform, omgeving, bundel_id')
    .in('profiel_id', opties.profielIds)

  if (!apparaten || apparaten.length === 0) return

  const teVerwijderen: string[] = []
  const logRegels: {
    type: string; profiel_id: string; platform: string
    token_staart: string; status: string; reden: string | null
  }[] = []

  await Promise.all((apparaten as PushApparaat[]).map(async apparaat => {
    const data = { type: opties.type, ...(opties.data ?? {}) }
    const badge = opties.badgePerProfiel?.[apparaat.profiel_id]

    try {
      if (apparaat.platform === 'ios') {
        const resultaat = await verstuurApns({
          token: apparaat.token,
          omgeving: apparaat.omgeving,
          bundelId: apparaat.bundel_id ?? process.env.APNS_BUNDLE_ID!,
          titel: opties.titel,
          body: opties.body,
          badge,
          gesprekId: opties.collapseId,
          data,
        })
        if (resultaat.status === 'verwijder_token') teVerwijderen.push(apparaat.token)
        logRegels.push({
          type: opties.type, profiel_id: apparaat.profiel_id, platform: 'ios',
          token_staart: tokenStaart(apparaat.token), status: resultaat.status,
          reden: 'reden' in resultaat ? resultaat.reden : null,
        })
      } else {
        const resultaat = await verstuurFcm({
          token: apparaat.token,
          titel: opties.titel,
          body: opties.body,
          gesprekId: opties.collapseId,
          data,
        })
        if (resultaat.status === 'verwijder_token') teVerwijderen.push(apparaat.token)
        logRegels.push({
          type: opties.type, profiel_id: apparaat.profiel_id, platform: 'android',
          token_staart: tokenStaart(apparaat.token), status: resultaat.status,
          reden: 'reden' in resultaat ? resultaat.reden : null,
        })
      }
    } catch (err) {
      logRegels.push({
        type: opties.type, profiel_id: apparaat.profiel_id, platform: apparaat.platform,
        token_staart: tokenStaart(apparaat.token), status: 'fout',
        reden: err instanceof Error ? err.message : String(err),
      })
    }
  }))

  if (teVerwijderen.length > 0) {
    await supabase.from('push_apparaten').delete().in('token', teVerwijderen)
  }
  if (logRegels.length > 0) {
    await supabase.from('push_log').insert(logRegels)
  }
}
