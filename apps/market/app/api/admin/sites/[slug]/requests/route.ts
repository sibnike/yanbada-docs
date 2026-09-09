import { NextResponse } from 'next/server'
import { one, q } from '@/lib/db'
import { bad, isUuid, ownerContext, readJson, text } from '@/lib/api'
import { loadPlans } from '@/lib/sites/load'
import { approveCards, cardLimitError } from '@/lib/sites/placements'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context
  const rows = await q(
    `SELECT r.*, t.name AS tenant_name FROM hub.site_placement_requests r
       LEFT JOIN public.tenants t ON t.id = r.tenant_id
      WHERE r.site_id = $1 AND r.status = 'pending' ORDER BY r.created_at`,
    [context.site.id]
  )
  return NextResponse.json({ requests: rows })
}

/** Owner invites a tenant: same table, other direction. */
export async function POST(request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context

  const body = await readJson(request)
  if (!isUuid(body.tenant_id)) return bad('Не выбрана компания')
  const listingIds = Array.isArray(body.listing_ids) ? body.listing_ids.filter(isUuid) : []

  const row = await one<{ id: string }>(
    `INSERT INTO hub.site_placement_requests
       (site_id, tenant_id, plan_id, direction, listing_ids, include_company, message, status)
     VALUES ($1, $2, $3, 'owner_invite', $4::uuid[], $5, $6, 'pending')
     RETURNING id`,
    [
      context.site.id,
      body.tenant_id,
      isUuid(body.plan_id) ? body.plan_id : null,
      listingIds,
      body.include_company !== false,
      text(body.message, 1000),
    ]
  )
  return NextResponse.json({ ok: true, id: row?.id })
}

export async function PATCH(request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context

  const body = await readJson(request)
  if (!isUuid(body.id)) return bad('Нет заявки')
  const action = String(body.action ?? '')

  const requestRow = await one<Record<string, unknown>>(
    'SELECT * FROM hub.site_placement_requests WHERE id = $1 AND site_id = $2',
    [body.id, context.site.id]
  )
  if (!requestRow) return bad('Заявка не найдена', 404)

  if (action === 'reject') {
    const reason = text(body.reject_reason, 600)
    // Without a reason the funnel dies: the tenant never learns what to fix.
    if (!reason) return bad('Укажите причину отказа — её увидит компания')
    await q(
      `UPDATE hub.site_placement_requests
          SET status = 'rejected', reject_reason = $2, decided_at = now()
        WHERE id = $1`,
      [body.id, reason]
    )
    return NextResponse.json({ ok: true, status: 'rejected' })
  }

  if (action !== 'approve') return bad('Неизвестное действие')

  const plans = await loadPlans(context.site.id)
  const plan = plans.find((p) => p.id === String(requestRow.plan_id ?? '')) ?? null
  const tenantId = String(requestRow.tenant_id)
  const listingIds = Array.isArray(requestRow.listing_ids) ? requestRow.listing_ids.map(String) : []
  const cards: (string | null)[] = requestRow.include_company === true ? [null, ...listingIds] : [...listingIds]
  if (cards.length === 0) return bad('В заявке нет карточек')

  const limit = await cardLimitError(context.site, tenantId, plan, cards.length)
  if (limit) return bad(limit)

  const created = await approveCards({ site: context.site, tenantId, plan, cards, requestId: String(requestRow.id) })

  await q(
    `UPDATE hub.site_placement_requests SET status = 'approved', decided_at = now(), reject_reason = NULL
      WHERE id = $1`,
    [requestRow.id]
  )

  return NextResponse.json({ ok: true, status: 'approved', ...created })
}
