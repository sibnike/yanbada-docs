import { NextRequest, NextResponse } from 'next/server'
import { isPlatformAdmin } from '@/lib/auth/current-tenant'
import { parseSiteRow } from '@/lib/sites/parse-site'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!(await isPlatformAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { slug } = await context.params
  const supabase = createAdminClient()
  const { data, error } = await supabase.schema('hub').from('sites').select('*').eq('slug', slug).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ site: parseSiteRow(data as Record<string, unknown>) })
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!(await isPlatformAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { slug } = await context.params
  const body = (await request.json()) as Record<string, unknown>
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  for (const key of [
    'name',
    'description',
    'template',
    'tenant_ids',
    'theme_slugs',
    'country_codes',
    'city_codes',
    'marketplace_slug',
    'featured_listing_ids',
    'subdomain',
    'custom_domain',
    'settings',
    'is_active',
  ] as const) {
    if (body[key] !== undefined) patch[key] = body[key]
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('hub')
    .from('sites')
    .update(patch)
    .eq('slug', slug)
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ site: parseSiteRow(data as Record<string, unknown>) })
}
