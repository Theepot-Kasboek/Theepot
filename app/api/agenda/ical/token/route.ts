import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

const TOEGESTANE_ROLLEN = ['superadmin', 'directie', 'leidinggevende']

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const profielId = searchParams.get('uid')

  if (!profielId) {
    return NextResponse.json({ error: 'uid ontbreekt' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profiel } = await supabase
    .from('profielen')
    .select('rol')
    .eq('id', profielId)
    .single()

  if (!profiel || !TOEGESTANE_ROLLEN.includes(profiel.rol)) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const token = createHmac('sha256', process.env.ICAL_SECRET!)
    .update(profielId)
    .digest('hex')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
  const url = `${baseUrl}/api/agenda/ical?uid=${profielId}&token=${token}`

  return NextResponse.json({ url })
}
