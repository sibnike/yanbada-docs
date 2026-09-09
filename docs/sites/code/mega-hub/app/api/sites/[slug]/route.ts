import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { loadPublicSitePayload } from '@/lib/sites/load-public-payload'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  if (!checkRateLimit(`sites-public:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 })
  }

  const { slug } = await context.params
  const payload = await loadPublicSitePayload(slug)
  if (!payload) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  // payout and private plans never leave the server
  return NextResponse.json(payload)
}
