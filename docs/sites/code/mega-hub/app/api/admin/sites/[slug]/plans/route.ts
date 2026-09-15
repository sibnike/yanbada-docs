import { NextRequest, NextResponse } from 'next/server'
import { getSiteAccess } from '@/lib/sites/site-access'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string }> }

const EDITABLE = [
  'name',
  'description',
  'price_per_card',
  'currency',
  'period_months',
  'card_quota',
  'slot',
  'trial_days',
  'perks',
  'is_public',
  'is_active',
  'sort_order',
] as const

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  const access = await getSiteAccess(slug)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('hub')
    .from('site_plans')
    .select('*')
    .eq('site_id', access.siteId)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ plans: data ?? [] })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  const access = await getSiteAccess(slug, ['owner'])
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const planSlug = String(body.slug ?? '').trim()
  if (!planSlug) return NextResponse.json({ error: 'slug обязателен' }, { status: 400 })

  const row: Record<string, unknown> = { site_id: access.siteId, slug: planSlug }
  for (const key of EDITABLE) {
    if (body[key] !== undefined) row[key] = body[key]
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('hub')
    .from('site_plans')
    .insert(row)
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ plan: data }, { status: 201 })
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  const access = await getSiteAccess(slug, ['owner'])
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const planId = String(body.plan_id ?? '')
  if (!planId) return NextResponse.json({ error: 'plan_id обязателен' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  for (const key of EDITABLE) {
    if (body[key] !== undefined) patch[key] = body[key]
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('hub')
    .from('site_plans')
    .update(patch)
    .eq('id', planId)
    .eq('site_id', access.siteId)
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ plan: data })
}
