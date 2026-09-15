import { NextResponse } from 'next/server'
import { hubDb, throwIf } from '@/lib/sb'
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

  const row = {
    site_id: context.site.id,
    slug: planSlug,
    name: { ru: name },
    description: { ru: text(body.description, 600) ?? '' },
    price_per_card: Math.max(0, Number(body.price_per_card ?? 0)),
    currency: text(body.currency, 8) ?? context.site.default_currency,
    period_months: Math.max(1, Number(body.period_months ?? 1)),
    card_quota: Math.max(1, Number(body.card_quota ?? 1)),
    slot: SLOTS.includes(String(body.slot)) ? String(body.slot) : 'standard',
    trial_days: Math.max(0, Number(body.trial_days ?? 0)),
    perks: Array.isArray(body.perks) ? body.perks.map(String).slice(0, 10) : [],
    is_public: body.is_public !== false,
    is_active: true,
    sort_order: Number(body.sort_order ?? 50),
  }

  const { data, error } = await hubDb()
    .from('site_plans')
    .upsert(row, { onConflict: 'site_id,slug' })
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
  if (!isUuid(body.id)) return bad('Нет тарифа')

  const patch: Record<string, unknown> = {}
  if (text(body.name, 120)) patch.name = { ru: text(body.name, 120) }
  if (body.description !== undefined) patch.description = { ru: text(body.description, 600) ?? '' }
  if (typeof body.price_per_card === 'number') patch.price_per_card = Math.max(0, body.price_per_card)
  if (typeof body.period_months === 'number') patch.period_months = Math.max(1, Math.trunc(body.period_months))
  if (typeof body.card_quota === 'number') patch.card_quota = Math.max(1, Math.trunc(body.card_quota))
  if (SLOTS.includes(String(body.slot))) patch.slot = String(body.slot)
  if (typeof body.trial_days === 'number') patch.trial_days = Math.max(0, Math.trunc(body.trial_days))
  if (typeof body.is_public === 'boolean') patch.is_public = body.is_public
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
  if (Array.isArray(body.perks)) patch.perks = body.perks.map(String).slice(0, 10)
  if (typeof body.sort_order === 'number') patch.sort_order = Math.trunc(body.sort_order)

  if (Object.keys(patch).length === 0) return bad('Нечего менять')

  const { data, error } = await hubDb()
    .from('site_plans')
    .update(patch)
    .eq('id', body.id)
    .eq('site_id', context.site.id)
    .select('*')
    .maybeSingle()
  throwIf(error)
  return NextResponse.json({ ok: true, plan: data })
}

export async function DELETE(request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context

  const body = await readJson(request)
  if (!isUuid(body.id)) return bad('Нет тарифа')
  const { error } = await hubDb()
    .from('site_plans')
    .update({ is_active: false })
    .eq('id', body.id)
    .eq('site_id', context.site.id)
  throwIf(error)
  return NextResponse.json({ ok: true })
}
