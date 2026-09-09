import { NextRequest, NextResponse } from 'next/server'
import { isPlatformAdmin } from '@/lib/auth/current-tenant'
import { listSites } from '@/lib/sites/get-site'
import { isSiteTemplate, parseSiteRow } from '@/lib/sites/parse-site'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type CreateBody = {
  slug?: string
  name?: Record<string, string>
  description?: Record<string, string> | null
  template?: string
  tenant_ids?: string[]
  theme_slugs?: string[]
  country_codes?: string[]
  city_codes?: string[]
  marketplace_slug?: string | null
  featured_listing_ids?: string[]
  subdomain?: string | null
  custom_domain?: string | null
  settings?: Record<string, unknown>
  is_active?: boolean
}

function asStringArray(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string' && v.length > 0) : []
}

export async function GET() {
  if (!(await isPlatformAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const sites = await listSites(true)
  return NextResponse.json({ sites })
}

export async function POST(request: NextRequest) {
  if (!(await isPlatformAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json()) as CreateBody
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(slug)) {
    return NextResponse.json({ error: 'Некорректный slug' }, { status: 400 })
  }
  if (!isSiteTemplate(body.template)) {
    return NextResponse.json({ error: 'template: operator | destination' }, { status: 400 })
  }
  if (!body.name || typeof body.name !== 'object') {
    return NextResponse.json({ error: 'name обязателен' }, { status: 400 })
  }

  const tenantIds = asStringArray(body.tenant_ids)
  const themeSlugs = asStringArray(body.theme_slugs)
  const countryCodes = asStringArray(body.country_codes).map((c) => c.toUpperCase())
  const cityCodes = asStringArray(body.city_codes).map((c) => c.toLowerCase())
  if (tenantIds.length + themeSlugs.length + countryCodes.length + cityCodes.length === 0) {
    return NextResponse.json({ error: 'Задайте хотя бы один фильтр scope' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('hub')
    .from('sites')
    .insert({
      slug,
      name: body.name,
      description: body.description ?? null,
      template: body.template,
      tenant_ids: tenantIds,
      theme_slugs: themeSlugs,
      country_codes: countryCodes,
      city_codes: cityCodes,
      marketplace_slug: body.marketplace_slug ?? 'tourhub',
      featured_listing_ids: asStringArray(body.featured_listing_ids),
      subdomain: body.subdomain ?? null,
      custom_domain: body.custom_domain ?? null,
      settings: body.settings ?? {},
      is_active: body.is_active !== false,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ site: parseSiteRow(data as Record<string, unknown>) }, { status: 201 })
}
