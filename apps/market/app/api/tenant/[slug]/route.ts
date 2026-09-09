import { NextResponse } from 'next/server'
import { one } from '@/lib/db'
import { bad, isUuid, readJson, tenantContext, text } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** The tenant side of the funnel: ask the market owner for a card. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const context = await tenantContext(slug)
  if (context instanceof NextResponse) return context
  if (!context.site.accepts_requests) return bad('Приём заявок закрыт', 403)

  const body = await readJson(request)
  const listingIds = Array.isArray(body.listing_ids) ? body.listing_ids.filter(isUuid) : []
  const includeCompany = body.include_company === true
  if (listingIds.length === 0 && !includeCompany) return bad('Выберите хотя бы одну карточку')

  const pending = await one<{ id: string }>(
    `SELECT id FROM hub.site_placement_requests
      WHERE site_id = $1 AND tenant_id = $2 AND status = 'pending'`,
    [context.site.id, context.session.tenant]
  )
  if (pending) return bad('Предыдущая заявка ещё на рассмотрении', 409)

  const row = await one<{ id: string }>(
    `INSERT INTO hub.site_placement_requests
       (site_id, tenant_id, plan_id, direction, listing_ids, include_company,
        message, contact, status, accepted_terms_at)
     VALUES ($1, $2, $3, 'tenant_request', $4::uuid[], $5, $6, $7, 'pending', now())
     RETURNING id`,
    [
      context.site.id,
      context.session.tenant,
      isUuid(body.plan_id) ? body.plan_id : null,
      listingIds,
      includeCompany,
      text(body.message, 1000),
      JSON.stringify({ name: context.session.name ?? '' }),
    ]
  )
  return NextResponse.json({ ok: true, id: row?.id })
}

/** Cancel a request the owner has not decided yet. */
export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const context = await tenantContext(slug)
  if (context instanceof NextResponse) return context

  const body = await readJson(request)
  if (!isUuid(body.id)) return bad('Нет заявки')
  await one(
    `UPDATE hub.site_placement_requests SET status = 'cancelled', decided_at = now()
      WHERE id = $1 AND site_id = $2 AND tenant_id = $3 AND status = 'pending'`,
    [body.id, context.site.id, context.session.tenant]
  )
  return NextResponse.json({ ok: true })
}
