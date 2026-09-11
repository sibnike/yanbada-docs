import { NextResponse } from 'next/server'
import { one } from '@/lib/db'
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

  const plan = text(body.plan_slug, 60)
    ? await one<{ id: string }>('SELECT id FROM hub.site_plans WHERE site_id = $1 AND slug = $2', [
        site.id,
        text(body.plan_slug, 60),
      ])
    : null

  const message = text(body.message, 2000)
  const acceptedTerms = body.accepted_terms === true ? new Date().toISOString() : null
  const session = await getSession()

  if (session?.role === 'tenant' && session.site === slug && session.tenant) {
    const contactName = text(body.contact_name, 120)
    const row = await one<{ id: string }>(
      `INSERT INTO hub.site_placement_requests
         (site_id, tenant_id, plan_id, direction, listing_ids, include_company,
          message, contact, status, accepted_terms_at)
       VALUES ($1, $2, $3, 'tenant_request', '{}', true, $4, $5, 'pending', $6)
       RETURNING id`,
      [
        site.id,
        session.tenant,
        plan?.id ?? null,
        message,
        JSON.stringify(contactName ? { ...cleaned, name: contactName } : cleaned),
        acceptedTerms,
      ]
    )
    return NextResponse.json({ ok: true, kind: 'request', id: row?.id })
  }

  const source = text(body.source, 200) || request.headers.get('referer')
  const row = await one<{ id: string }>(
    `INSERT INTO hub.site_leads
       (site_id, plan_id, company_name, contact_name, contact, message, source, accepted_terms_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      site.id,
      plan?.id ?? null,
      companyName,
      text(body.contact_name, 120),
      JSON.stringify(cleaned),
      message,
      source,
      acceptedTerms,
    ]
  )

  return NextResponse.json({ ok: true, kind: 'lead', id: row?.id })
}
