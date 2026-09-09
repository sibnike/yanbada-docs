import { NextRequest, NextResponse } from 'next/server'
import { getSiteAccess } from '@/lib/sites/site-access'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string }> }

type DecideBody = {
  request_id?: string
  action?: 'approve' | 'reject'
  reject_reason?: string
  slot?: 'standard' | 'featured' | 'pinned'
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  const access = await getSiteAccess(slug, ['owner', 'moderator'])
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createAdminClient()
  const [requests, leads] = await Promise.all([
    supabase
      .schema('hub')
      .from('site_placement_requests')
      .select('*')
      .eq('site_id', access.siteId)
      .order('created_at', { ascending: false }),
    supabase
      .schema('hub')
      .from('site_leads')
      .select('*')
      .eq('site_id', access.siteId)
      .order('created_at', { ascending: false }),
  ])

  if (requests.error) return NextResponse.json({ error: requests.error.message }, { status: 400 })

  return NextResponse.json({
    requests: requests.data ?? [],
    leads: leads.data ?? [],
  })
}

/**
 * Approve turns a request into placements: one row per card, priced from the
 * plan. Free plans and trials get paid_until = NULL so the card stays live.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  const access = await getSiteAccess(slug, ['owner', 'moderator'])
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as DecideBody
  if (!body.request_id || (body.action !== 'approve' && body.action !== 'reject')) {
    return NextResponse.json({ error: 'request_id и action обязательны' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: row, error: loadError } = await supabase
    .schema('hub')
    .from('site_placement_requests')
    .select('*')
    .eq('id', body.request_id)
    .eq('site_id', access.siteId)
    .maybeSingle()

  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 400 })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const req = row as {
    id: string
    tenant_id: string
    plan_id: string | null
    listing_ids: string[] | null
    include_company: boolean
    status: string
  }

  if (req.status !== 'pending') {
    return NextResponse.json({ error: 'Заявка уже обработана' }, { status: 409 })
  }

  if (body.action === 'reject') {
    const reason = (body.reject_reason ?? '').trim()
    if (!reason) {
      return NextResponse.json(
        { error: 'Нужна причина отказа — тенант должен понять, что исправить' },
        { status: 400 }
      )
    }
    const { error } = await supabase
      .schema('hub')
      .from('site_placement_requests')
      .update({
        status: 'rejected',
        reject_reason: reason.slice(0, 1000),
        decided_at: new Date().toISOString(),
      })
      .eq('id', req.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, status: 'rejected' })
  }

  const { data: planRow } = req.plan_id
    ? await supabase.schema('hub').from('site_plans').select('*').eq('id', req.plan_id).maybeSingle()
    : { data: null }

  const plan = planRow as {
    price_per_card: number
    currency: string
    period_months: number
    card_quota: number
    slot: 'standard' | 'featured' | 'pinned'
    trial_days: number
  } | null

  const listingIds = Array.isArray(req.listing_ids) ? req.listing_ids : []
  const quota = plan?.card_quota ?? listingIds.length + (req.include_company ? 1 : 0)
  const cards: Array<string | null> = [
    ...(req.include_company ? [null] : []),
    ...listingIds,
  ].slice(0, Math.max(quota, 1))

  if (cards.length === 0) {
    return NextResponse.json({ error: 'В заявке нет карточек' }, { status: 400 })
  }

  const price = plan?.price_per_card ?? 0
  const trialOnly = price === 0 || (plan?.trial_days ?? 0) > 0
  const paidUntil = trialOnly ? null : addMonths(new Date(), plan?.period_months ?? 1).toISOString()

  const rows = cards.map((listingId) => ({
    site_id: access.siteId,
    tenant_id: req.tenant_id,
    listing_id: listingId,
    plan_id: req.plan_id,
    request_id: req.id,
    slot: body.slot ?? plan?.slot ?? 'standard',
    status: 'active',
    price_per_period: price,
    currency: plan?.currency ?? 'KGS',
    paid_until: paidUntil,
  }))

  const { error: placeError } = await supabase
    .schema('hub')
    .from('site_placements')
    .upsert(rows, { onConflict: 'site_id,listing_id' })

  if (placeError) {
    console.error('[approve placement]', placeError.message)
    return NextResponse.json({ error: placeError.message }, { status: 400 })
  }

  const { error } = await supabase
    .schema('hub')
    .from('site_placement_requests')
    .update({ status: 'approved', decided_at: new Date().toISOString() })
    .eq('id', req.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, status: 'approved', placements: rows.length })
}

function addMonths(from: Date, months: number): Date {
  const date = new Date(from)
  date.setMonth(date.getMonth() + months)
  return date
}
