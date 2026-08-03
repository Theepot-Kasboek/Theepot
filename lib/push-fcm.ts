import { createSign } from 'node:crypto'

// FCM v1 hand-gerold (geen google-auth-library): dat sleept gaxios/gtoken mee
// voor iets dat in een paar regels kan. Plain fetch volstaat, FCM praat gewoon
// HTTP/1.1 (in tegenstelling tot APNs).

interface ServiceAccount {
  client_email: string
  private_key: string
  project_id: string
}

let gecachteAccessToken: { token: string; verlooptOp: number } | null = null

function base64url(input: Buffer | string): string {
  return Buffer.from(input as string)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function laadServiceAccount(): ServiceAccount {
  const json = Buffer.from(process.env.FCM_SERVICE_ACCOUNT_B64!, 'base64').toString('utf8')
  return JSON.parse(json)
}

async function haalAccessToken(): Promise<string> {
  if (gecachteAccessToken && Date.now() < gecachteAccessToken.verlooptOp) {
    return gecachteAccessToken.token
  }

  const account = laadServiceAccount()
  const nu = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: nu,
    exp: nu + 3600,
  }

  const headerB64 = base64url(JSON.stringify(header))
  const claimsB64 = base64url(JSON.stringify(claims))
  const ondertekend = `${headerB64}.${claimsB64}`
  const handtekening = createSign('RSA-SHA256').update(ondertekend).sign(account.private_key)
  const jwt = `${ondertekend}.${base64url(handtekening)}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!res.ok) throw new Error(`FCM oauth2-token ophalen mislukt: ${res.status} ${await res.text()}`)
  const data = await res.json() as { access_token: string; expires_in: number }

  gecachteAccessToken = {
    token: data.access_token,
    verlooptOp: Date.now() + Math.max(0, (data.expires_in - 300)) * 1000, // ~3300s bij expires_in 3600
  }
  return gecachteAccessToken.token
}

function legeAccessTokenCache() {
  gecachteAccessToken = null
}

export interface FcmBericht {
  token: string
  titel: string
  body: string
  gesprekId?: string
  data?: Record<string, string>
}

export type FcmResultaat =
  | { status: 'ok' }
  | { status: 'verwijder_token'; reden: string }
  | { status: 'overslaan'; reden: string }
  | { status: 'retry'; reden: string }

export async function verstuurFcm(bericht: FcmBericht): Promise<FcmResultaat> {
  const projectId = process.env.FCM_PROJECT_ID!
  const accessToken = await haalAccessToken()

  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      message: {
        token: bericht.token,
        // Hybride notification + data (niet data-only): garandeert weergave
        // ook bij agressief batterijbeheer (Samsung-toestellen).
        notification: { title: bericht.titel, body: bericht.body },
        data: bericht.data ?? {},
        android: {
          notification: {
            ...(bericht.gesprekId ? { tag: bericht.gesprekId } : {}),
          },
        },
      },
    }),
  })

  if (res.ok) return { status: 'ok' }

  const tekst = await res.text()
  let errorCode: string | undefined
  try {
    const json = JSON.parse(tekst)
    errorCode = json?.error?.details?.find((d: { errorCode?: string }) => d.errorCode)?.errorCode
  } catch {}

  if (res.status === 404 || errorCode === 'UNREGISTERED' || errorCode === 'INVALID_ARGUMENT') {
    return { status: 'verwijder_token', reden: errorCode ?? `http ${res.status}` }
  }
  if (res.status === 403 || errorCode === 'SENDER_ID_MISMATCH') {
    return { status: 'verwijder_token', reden: errorCode ?? 'SENDER_ID_MISMATCH' }
  }
  if (res.status === 401) {
    legeAccessTokenCache()
    return { status: 'retry', reden: 'unauthenticated' }
  }
  return { status: 'overslaan', reden: errorCode ?? `http ${res.status}` }
}
