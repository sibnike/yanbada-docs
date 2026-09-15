import { NextResponse } from 'next/server'
import { hubDb, throwIf } from '@/lib/sb'
import { addMonths } from '@/lib/sites/billing'
import { bad, isUuid, ownerContext, readJson, text } from '@/lib/api'
import { issueInvoice } from '@/lib/sites/billing'
import { loadPlans } from '@/lib/sites/load'
import { approveCards, cardLimitError } from '@/lib/sites/placements'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

/** Owner places a card directly, without waiting for a request. */
export async function POST(request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context

  const body = await readJson(request)
  if (!isUuid(body.tenant_id)) return bad('Не выбрана компания')

  const listingIds = Array.isArray(body.listing_ids) ? body.listing_ids.filter(isUuid) : []
  const cards: (string | null)[] = body.include_company === true ? [null, ...listingIds] : [...listingIds]
  if (cards.length === 0) return bad('Не выбрана ни одна карточка')

  const plans = await loadPlans(context.site.id)
  const plan = plans.find((p) => p.id === String(body.plan_id ?? '')) ?? null
  const limit = await cardLimitError(context.site, String(body.tenant_id), plan, cards.length)
  if (limit) return bad(limit)

  const created = await approveCards({
    site: context.site,
    tenantId: String(body.tenant_id),
    plan,
    cards,
    requestId: null,
  })
  return NextResponse.json({ ok: true, ...created })
}

export async function PATCH(request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context

  const body = await readJson(request)
  if (!isUuid(body.id)) return bad('Нет размещения')

  const { data: placement, error } = await hubDb()
    .from('site_placements')
    .select('*')
    .eq('id', body.id)
    .eq('site_id', context.site.id)
    .maybeSingle()
  throwIf(error)
  if (!placement) return bad('Размещение не найдено', 404)

  if (body.action === 'extend') {
    const months = Number(body.months ?? 1)
    const amount = Number(placement.price_per_period ?? 0)
    if (amount <= 0) {
      const from = new Date(
        Math.max(
          Date.now(),
          placement.paid_until ? new Date(String(placement.paid_until)).getTime() : 0
        )
      )
      const { error: updateError } = await hubDb()
        .from('site_placements')
        .update({
          paid_until: addMonths(from, months).toISOString(),
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', placement.id)
      throwIf(updateError)
      return NextResponse.json({ ok: true, invoice: null })
    }
    const invoice = await issueInvoice({
      site: context.site,
      tenantId: String(placement.tenant_id),
      placementId: String(placement.id),
      amount: amount * months,
      currency: String(placement.currency),
      months,
    })
    return NextResponse.json({ ok: true, invoice })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (
    typeof body.status === 'string' &&
    ['active', 'pending_payment', 'paused', 'expired', 'hidden'].includes(body.status)
  ) {
    patch.status = body.status
  }
  if (typeof body.slot === 'string' && ['standard', 'featured', 'pinned'].includes(body.slot)) {
    patch.slot = body.slot
  }
  if (typeof body.sort_weight === 'number') patch.sort_weight = Math.trunc(body.sort_weight)
  if (typeof body.grace_days === 'number') patch.grace_days = Math.max(0, Math.trunc(body.grace_days))
  if (typeof body.price_per_period === 'number') patch.price_per_period = Math.max(0, body.price_per_period)
  if (body.hidden_reason !== undefined) patch.hidden_reason = text(body.hidden_reason, 400)
  if (body.paid_until === null) patch.paid_until = null
  else if (typeof body.paid_until === 'string') patch.paid_until = body.paid_until

  if (Object.keys(patch).length === 1) return bad('Нечего менять')

  const { data: row, error: updateError } = await hubDb()
    .from('site_placements')
    .update(patch)
    .eq('id', placement.id)
    .select('*')
    .maybeSingle()
  throwIf(updateError)
  return NextResponse.json({ ok: true, placement: row })
}

export async function DELETE(request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context

  const body = await readJson(request)
  if (!isUuid(body.id)) return bad('Нет размещения')
  const { error } = await hubDb()
    .from('site_placements')
    .delete()
    .eq('id', body.id)
    .eq('site_id', context.site.id)
  throwIf(error)
  return NextResponse.json({ ok: true })
}
