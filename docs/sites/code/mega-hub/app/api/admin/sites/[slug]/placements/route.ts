import { NextRequest, NextResponse } from 'next/server'
import { getSiteAccess } from '@/lib/sites/site-access'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string }> }

type PatchBody = {
  placement_id?: string
  status?: 'active' | 'pending_payment' | 'paused' | 'expired' | 'hidden'
  slot?: 'standard' | 'featured' | 'pinned'
  sort_weight?: number
  hidden_reason?: string
  extend_months?: number
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  const access = await getSiteAccess(slug, ['owner', 'moderator'])
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('hub')
    .from('site_placements')
    .select('*')
    .eq('site_id', access.siteId)
    .order('sort_weight', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ placements: data ?? [] })
}

/** Owner controls what is on the page and until when. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  const access = await getSiteAccess(slug, ['owner', 'moderator'])
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as PatchBody
  if (!body.placement_id) {
    return NextResponse.json({ error: 'placement_id обязателен' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: current, error: loadError } = await supabase
    .schema('hub')
    .from('site_placements')
    .select('paid_until')
    .eq('id', body.placement_id)
    .eq('site_id', access.siteId)
    .maybeSingle()

  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 400 })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status) patch.status = body.status
  if (body.slot) patch.slot = body.slot
  if (typeof body.sort_weight === 'number') patch.sort_weight = body.sort_weight
  if (body.hidden_reason !== undefined) patch.hidden_reason = body.hidden_reason?.slice(0, 500) ?? null

  if (body.extend_months) {
    const paidUntil = (current as { paid_until: string | null }).paid_until
    // Extend from the later of now and the current end, so an early payment is not lost.
    const base = paidUntil && new Date(paidUntil) > new Date() ? new Date(paidUntil) : new Date()
    base.setMonth(base.getMonth() + body.extend_months)
    patch.paid_until = base.toISOString()
    patch.status = body.status ?? 'active'
  }

  const { data, error } = await supabase
    .schema('hub')
    .from('site_placements')
    .update(patch)
    .eq('id', body.placement_id)
    .eq('site_id', access.siteId)
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ placement: data })
}

/** Owner invites a tenant card directly, without waiting for a request. */
export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  const access = await getSiteAccess(slug, ['owner'])
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as {
    tenant_id?: string
    listing_id?: string | null
    plan_id?: string | null
    slot?: 'standard' | 'featured' | 'pinned'
  }

  if (!body.tenant_id) {
    return NextResponse.json({ error: 'tenant_id обязателен' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('hub')
    .from('site_placements')
    .upsert(
      {
        site_id: access.siteId,
        tenant_id: body.tenant_id,
        listing_id: body.listing_id ?? null,
        plan_id: body.plan_id ?? null,
        slot: body.slot ?? 'standard',
        status: 'active',
      },
      { onConflict: 'site_id,tenant_id,listing_id' }
    )
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ placement: data })
}
