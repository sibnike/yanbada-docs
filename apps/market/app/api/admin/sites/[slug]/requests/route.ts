import { NextResponse } from 'next/server'
import { hubDb, throwIf } from '@/lib/sb'
import { bad, isUuid, ownerContext, readJson, text } from '@/lib/api'
import { loadPlans } from '@/lib/sites/load'
import { approveCards, cardLimitError } from '@/lib/sites/placements'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context
  const { data, error } = await hubDb()
    .from('site_placement_requests')
    .select('*')
    .eq('site_id', context.site.id)
    .eq('status', 'pending')
    .order('created_at')
  throwIf(error)
  return NextResponse.json({ requests: data ?? [] })
}

/** Owner invites a tenant: same table, other direction. */
export async function POST(request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context

  const body = await readJson(request)
  if (!isUuid(body.tenant_id)) return bad('Не выбрана компания')
  const listingIds = Array.isArray(body.listing_ids) ? body.listing_ids.filter(isUuid) : []

  const { data, error } = await hubDb()
    .from('site_placement_requests')
    .insert({
      site_id: context.site.id,
      tenant_id: body.tenant_id,
      plan_id: isUuid(body.plan_id) ? body.plan_id : null,
      direction: 'owner_invite',
      listing_ids: listingIds,
      include_company: body.include_company !== false,
      message: text(body.message, 1000),
      status: 'pending',
    })
    .select('id')
    .maybeSingle()
  throwIf(error)
  return NextResponse.json({ ok: true, id: data?.id })
}

export async function PATCH(request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context

  const body = await readJson(request)
  if (!isUuid(body.id)) return bad('Нет заявки')
  const action = String(body.action ?? '')

  const { data: requestRow, error } = await hubDb()
    .from('site_placement_requests')
    .select('*')
    .eq('id', body.id)
    .eq('site_id', context.site.id)
    .maybeSingle()
  throwIf(error)
  if (!requestRow) return bad('Заявка не найдена', 404)

  if (action === 'reject') {
    const reason = text(body.reject_reason, 600)
    if (!reason) return bad('Укажите причину отказа — её увидит компания')
    const { error: updateError } = await hubDb()
      .from('site_placement_requests')
      .update({ status: 'rejected', reject_reason: reason, decided_at: new Date().toISOString() })
      .eq('id', body.id)
    throwIf(updateError)
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

  const created = await approveCards({
    site: context.site,
    tenantId,
    plan,
    cards,
    requestId: String(requestRow.id),
  })

  const { error: approveError } = await hubDb()
    .from('site_placement_requests')
    .update({ status: 'approved', decided_at: new Date().toISOString(), reject_reason: null })
    .eq('id', requestRow.id)
  throwIf(approveError)

  return NextResponse.json({ ok: true, status: 'approved', ...created })
}
