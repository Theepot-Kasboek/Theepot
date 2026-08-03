import http2 from 'node:http2'
import { createSign } from 'node:crypto'

// APNs praat alleen HTTP/2, en Node's fetch (undici) kan geen HTTP/2 —
// vandaar node:http2 in plaats van fetch. Eén sessie per invocation
// (niet cachen tussen invocations: een bevroren Fluid Compute-instance
// heeft een dode socket). De JWT zelf (een string) mag wél module-scope
// gecached worden.

const JWT_GELDIGHEID_MS = 50 * 60 * 1000 // Apple staat 20-60 min toe, wij hergebruiken ~50 min

let gecachteJwt: { token: string; aangemaakt: number } | null = null

function base64url(input: Buffer | string): string {
  return Buffer.from(input as string)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function maakApnsJwt(): string {
  if (gecachteJwt && Date.now() - gecachteJwt.aangemaakt < JWT_GELDIGHEID_MS) {
    return gecachteJwt.token
  }

  const teamId = process.env.APNS_TEAM_ID!
  const keyId = process.env.APNS_KEY_ID!
  const privateKey = Buffer.from(process.env.APNS_PRIVATE_KEY_B64!, 'base64').toString('utf8')

  const header = { alg: 'ES256', kid: keyId }
  const claims = { iss: teamId, iat: Math.floor(Date.now() / 1000) }

  const headerB64 = base64url(JSON.stringify(header))
  const claimsB64 = base64url(JSON.stringify(claims))
  const ondertekend = `${headerB64}.${claimsB64}`

  // KRITIEK: dsaEncoding 'ieee-p1363' — zonder dit levert Node een DER-signature
  // terwijl APNs de rauwe 64-byte r||s verwacht (anders onbegrijpelijke 403 InvalidProviderToken).
  const handtekening = createSign('SHA256')
    .update(ondertekend)
    .sign({ key: privateKey, dsaEncoding: 'ieee-p1363' })

  const token = `${ondertekend}.${base64url(handtekening)}`
  gecachteJwt = { token, aangemaakt: Date.now() }
  return token
}

function legeJwtCache() {
  gecachteJwt = null
}

export interface ApnsBericht {
  token: string
  omgeving: 'sandbox' | 'productie'
  bundelId: string
  titel: string
  body: string
  badge?: number
  gesprekId?: string
  data?: Record<string, string>
}

export type ApnsResultaat =
  | { status: 'ok' }
  | { status: 'verwijder_token'; reden: string }
  | { status: 'overslaan'; reden: string }
  | { status: 'retry'; reden: string }

function host(omgeving: 'sandbox' | 'productie') {
  return omgeving === 'sandbox' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com'
}

async function verstuurNaarHost(bericht: ApnsBericht, apnsHost: string, jwt: string): Promise<{ status: number; reden?: string }> {
  return new Promise((resolve, reject) => {
    const session = http2.connect(`https://${apnsHost}`)
    session.on('error', reject)

    const payload = JSON.stringify({
      aps: {
        alert: { title: bericht.titel, body: bericht.body },
        sound: 'default',
        ...(bericht.badge !== undefined ? { badge: bericht.badge } : {}),
        ...(bericht.gesprekId ? { 'thread-id': bericht.gesprekId } : {}),
      },
      ...(bericht.data ?? {}),
    })

    const req = session.request({
      ':method': 'POST',
      ':path': `/3/device/${bericht.token}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': bericht.bundelId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      ...(bericht.gesprekId ? { 'apns-collapse-id': bericht.gesprekId } : {}),
      'content-type': 'application/json',
    })

    let responseBody = ''
    let statusCode = 0
    req.on('response', headers => {
      statusCode = Number(headers[':status'] ?? 0)
    })
    req.on('data', chunk => { responseBody += chunk })
    req.on('end', () => {
      session.close()
      let reden: string | undefined
      try { reden = responseBody ? JSON.parse(responseBody).reason : undefined } catch {}
      resolve({ status: statusCode, reden })
    })
    req.on('error', err => { session.close(); reject(err) })

    req.write(payload)
    req.end()
  })
}

export async function verstuurApns(bericht: ApnsBericht): Promise<ApnsResultaat> {
  const jwt = maakApnsJwt()
  let { status, reden } = await verstuurNaarHost(bericht, host(bericht.omgeving), jwt)

  // Server-vangnet: verkeerde omgeving geregistreerd — eenmalig de andere host proberen.
  if (status === 400 && reden === 'BadDeviceToken') {
    const anderOmgeving = bericht.omgeving === 'sandbox' ? 'productie' : 'sandbox'
    const tweedePoging = await verstuurNaarHost(bericht, host(anderOmgeving), jwt)
    status = tweedePoging.status
    reden = tweedePoging.reden
  }

  if (status === 200) return { status: 'ok' }

  if (status === 410 || reden === 'Unregistered' || reden === 'DeviceTokenNotForTopic') {
    return { status: 'verwijder_token', reden: reden ?? `http ${status}` }
  }
  if (reden === 'InvalidProviderToken' || reden === 'ExpiredProviderToken') {
    legeJwtCache()
    return { status: 'retry', reden }
  }
  if (status === 429) {
    return { status: 'overslaan', reden: 'TooManyRequests' }
  }
  return { status: 'overslaan', reden: reden ?? `http ${status}` }
}
