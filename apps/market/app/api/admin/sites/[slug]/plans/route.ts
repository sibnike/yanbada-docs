import { NextResponse } from 'next/server'
import { one, q } from '@/lib/db'
import { bad, isUuid, ownerContext, readJson, text } from '@/lib/api'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

const SLOTS = ['standard', 'featured', 'pinned']

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context

  const body = await readJson(request)
  const planSlug = text(body.slug, 40)?.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const name = text(body.name, 120)
  if (!planSlug || !name) return bad('Нужны название и код тарифа')

  const row = await one<{ id: string }>(
    `INSERT INTO hub.site_plans
       (site_id, slug, name, description, price_per_card, currency, period_months,
        card_quota, slot, trial_days, perks, is_public, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (site_id, slug) DO UPDATE SET
       name = EXCLUDED.name, description = EXCLUDED.description,
       price_per_card = EXCLUDED.price_per_card, period_months = EXCLUDED.period_months,
       card_quota = EXCLUDED.card_quota, slot = EXCLUDED.slot, trial_days = EXCLUDED.trial_days,
       perks = EXCLUDED.perks, is_public = EXCLUDED.is_public, is_active = true
     RETURNING id`,
    [
      context.site.id,
      planSlug,
      JSON.stringify({ ru: name }),
      JSON.stringify({ ru: text(body.description, 600) ?? '' }),
      Math.max(0, Number(body.price_per_card ?? 0)),
      text(body.currency, 8) ?? context.site.default_currency,
      Math.max(1, Number(body.period_months ?? 1)),
      Math.max(1, Number(body.card_quota ?? 1)),
      SLOTS.includes(String(body.slot)) ? String(body.slot) : 'standard',
      Math.max(0, Number(body.trial_days ?? 0)),
      JSON.stringify(Array.isArray(body.perks) ? body.perks.map(String).slice(0, 10) : []),
      body.is_public !== false,
      Number(body.sort_order ?? 50),
    ]
  )
  return NextResponse.json({ ok: true, id: row?.id })
}

export async function PATCH(request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context

  const body = await readJson(request)
  if (!isUuid(body.id)) return bad('Нет тарифа')

  const sets: string[] = []
  const values: unknown[] = [body.id, context.site.id]
  const push = (column: string, value: unknown) => {
    values.push(value)
    sets.push(`${column} = $${values.length}`)
  }

  if (text(body.name, 120)) push('name', JSON.stringify({ ru: text(body.name, 120) }))
  if (body.description !== undefined) push('description', JSON.stringify({ ru: text(body.description, 600) ?? '' }))
  if (typeof body.price_per_card === 'number') push('price_per_card', Math.max(0, body.price_per_card))
  if (typeof body.period_months === 'number') push('period_months', Math.max(1, Math.trunc(body.period_months)))
  if (typeof body.card_quota === 'number') push('card_quota', Math.max(1, Math.trunc(body.card_quota)))
  if (SLOTS.includes(String(body.slot))) push('slot', String(body.slot))
  if (typeof body.trial_days === 'number') push('trial_days', Math.max(0, Math.trunc(body.trial_days)))
  if (typeof body.is_public === 'boolean') push('is_public', body.is_public)
  if (typeof body.is_active === 'boolean') push('is_active', body.is_active)
  if (Array.isArray(body.perks)) push('perks', JSON.stringify(body.perks.map(String).slice(0, 10)))
  if (typeof body.sort_order === 'number') push('sort_order', Math.trunc(body.sort_order))

  if (sets.length === 0) return bad('Нечего менять')

  const row = await one(
    `UPDATE hub.site_plans SET ${sets.join(', ')} WHERE id = $1 AND site_id = $2 RETURNING *`,
    values
  )
  return NextResponse.json({ ok: true, plan: row })
}

export async function DELETE(request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context

  const body = await readJson(request)
  if (!isUuid(body.id)) return bad('Нет тарифа')
  // Placements point at plans, so retire instead of deleting history.
  await q('UPDATE hub.site_plans SET is_active = false WHERE id = $1 AND site_id = $2', [
    body.id,
    context.site.id,
  ])
  return NextResponse.json({ ok: true })
}
