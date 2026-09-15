import { NextResponse } from 'next/server'
import { hubDb, throwIf } from '@/lib/sb'
import { bad, readJson, siteOr404, text } from '@/lib/api'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const seen = new Map<string, number[]>()
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5

function throttled(key: string): boolean {
  const now = Date.now()
  const hits = (seen.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  hits.push(now)
  seen.set(key, hits)
  return hits.length > MAX_PER_WINDOW
}

/**
 * Public intake. A signed-in tenant gets a placement request the owner can
 * approve straight into a card; everyone else becomes a lead, because most
 * local businesses a market owner recruits have no Vitrina account yet.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const site = await siteOr404(slug)
  if (site instanceof NextResponse) return site
  if (!site.accepts_requests) return bad('Приём заявок закрыт', 403)

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (throttled(`${slug}:${ip}`)) return bad('Слишком много заявок подряд, попробуйте позже', 429)

  const body = await readJson(request)
  const companyName = text(body.company_name, 200)
  if (!companyName) return bad('Укажите название компании')

  const contact = (body.contact && typeof body.contact === 'object' ? body.contact : {}) as Record<string, unknown>
  const cleaned: Record<string, string> = {}
  for (const key of ['phone', 'email', 'telegram'] as const) {
    const value = text(contact[key], 120)
    if (value) cleaned[key] = value
  }
  if (Object.keys(cleaned).length === 0) return bad('Оставьте хотя бы один контакт')

  let planId: string | null = null
  const planSlug = text(body.plan_slug, 60)
  if (planSlug) {
    const { data, error } = await hubDb()
      .from('site_plans')
      .select('id')
      .eq('site_id', site.id)
      .eq('slug', planSlug)
      .maybeSingle()
    throwIf(error)
    planId = data?.id ? String(data.id) : null
  }

  const message = text(body.message, 2000)
  const acceptedTerms = body.accepted_terms === true ? new Date().toISOString() : null
  const session = await getSession()

  if (session?.role === 'tenant' && session.site === slug && session.tenant) {
    const contactName = text(body.contact_name, 120)
    const { data, error } = await hubDb()
      .from('site_placement_requests')
      .insert({
        site_id: site.id,
        tenant_id: session.tenant,
        plan_id: planId,
        direction: 'tenant_request',
        listing_ids: [],
        include_company: true,
        message,
        contact: contactName ? { ...cleaned, name: contactName } : cleaned,
        status: 'pending',
        accepted_terms_at: acceptedTerms,
      })
      .select('id')
      .maybeSingle()
    throwIf(error)
    return NextResponse.json({ ok: true, kind: 'request', id: data?.id })
  }

  const source = text(body.source, 200) || request.headers.get('referer')
  const { data, error } = await hubDb()
    .from('site_leads')
    .insert({
      site_id: site.id,
      plan_id: planId,
      company_name: companyName,
      contact_name: text(body.contact_name, 120),
      contact: cleaned,
      message,
      source,
      accepted_terms_at: acceptedTerms,
    })
    .select('id')
    .maybeSingle()
  throwIf(error)

  return NextResponse.json({ ok: true, kind: 'lead', id: data?.id })
}
