import { NextRequest, NextResponse } from 'next/server'
import { isPlatformAdmin } from '@/lib/auth/current-tenant'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseSiteRow } from '@/lib/sites/parse-site'
import { SITE_BLOCK_TYPES } from '@/types/site'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string; pageId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  if (!(await isPlatformAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { slug, pageId } = await context.params
  const body = (await request.json()) as { type?: string; payload?: Record<string, unknown> }
  if (!body.type || !SITE_BLOCK_TYPES.includes(body.type as (typeof SITE_BLOCK_TYPES)[number])) {
    return NextResponse.json({ error: 'Неизвестный тип блока' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: site } = await supabase.schema('hub').from('sites').select('*').eq('slug', slug).maybeSingle()
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  parseSiteRow(site as Record<string, unknown>)

  const { data: page } = await supabase
    .schema('hub')
    .from('site_pages')
    .select('id, site_id')
    .eq('id', pageId)
    .eq('site_id', (site as { id: string }).id)
    .maybeSingle()
  if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 })

  const { data: last } = await supabase
    .schema('hub')
    .from('site_blocks')
    .select('sort_order')
    .eq('page_id', pageId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: inserted, error } = await supabase
    .schema('hub')
    .from('site_blocks')
    .insert({
      page_id: pageId,
      type: body.type,
      payload: body.payload ?? {},
      sort_order: (typeof last?.sort_order === 'number' ? last.sort_order : 0) + 10,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ block: inserted }, { status: 201 })
}
