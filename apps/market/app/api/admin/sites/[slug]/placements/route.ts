import { NextResponse } from 'next/server'
import { one, q } from '@/lib/db'
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

  const placement = await one<Record<string, unknown>>(
    'SELECT * FROM hub.site_placements WHERE id = $1 AND site_id = $2',
    [body.id, context.site.id]
  )
  if (!placement) return bad('Размещение не найдено', 404)

  // Extension is billing, not an edit: it issues the next invoice.
  if (body.action === 'extend') {
    const months = Number(body.months ?? 1)
    const amount = Number(placement.price_per_period ?? 0)
    if (amount <= 0) {
      await q(
        `UPDATE hub.site_placements
            SET paid_until = GREATEST(COALESCE(paid_until, now()), now()) + make_interval(months => $2),
                status = 'active', updated_at = now()
          WHERE id = $1`,
        [placement.id, months]
      )
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

  const sets: string[] = []
  const values: unknown[] = [placement.id]
  const push = (column: string, value: unknown) => {
    values.push(value)
    sets.push(`${column} = $${values.length}`)
  }

  if (typeof body.status === 'string' &&
      ['active', 'pending_payment', 'paused', 'expired', 'hidden'].includes(body.status)) {
    push('status', body.status)
  }
  if (typeof body.slot === 'string' && ['standard', 'featured', 'pinned'].includes(body.slot)) {
    push('slot', body.slot)
  }
  if (typeof body.sort_weight === 'number') push('sort_weight', Math.trunc(body.sort_weight))
  if (typeof body.grace_days === 'number') push('grace_days', Math.max(0, Math.trunc(body.grace_days)))
  if (typeof body.price_per_period === 'number') push('price_per_period', Math.max(0, body.price_per_period))
  if (body.hidden_reason !== undefined) push('hidden_reason', text(body.hidden_reason, 400))
  if (body.paid_until === null) push('paid_until', null)
  else if (typeof body.paid_until === 'string') push('paid_until', body.paid_until)

  if (sets.length === 0) return bad('Нечего менять')

  const row = await one(
    `UPDATE hub.site_placements SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`,
    values
  )
  return NextResponse.json({ ok: true, placement: row })
}

export async function DELETE(request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context

  const body = await readJson(request)
  if (!isUuid(body.id)) return bad('Нет размещения')
  await q('DELETE FROM hub.site_placements WHERE id = $1 AND site_id = $2', [body.id, context.site.id])
  return NextResponse.json({ ok: true })
}
