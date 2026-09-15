import { NextResponse } from 'next/server'
import { isPlatformAdmin } from '@/lib/auth/current-tenant'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseSiteRow } from '@/lib/sites/parse-site'
import { loadSitePages, loadSitePosts } from '@/lib/sites/load-site-content'
import { loadAssistantKnowledge } from '@/lib/sites/build-assistant-context'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, context: RouteContext) {
  if (!(await isPlatformAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { slug } = await context.params
  const supabase = createAdminClient()
  const { data, error } = await supabase.schema('hub').from('sites').select('*').eq('slug', slug).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const site = parseSiteRow(data as Record<string, unknown>)
  const [pages, posts, knowledge] = await Promise.all([
    loadSitePages(site.id),
    loadSitePosts(site.id),
    loadAssistantKnowledge(site.id),
  ])
  return NextResponse.json({ site, pages, posts, knowledge: knowledge.siteKnowledge })
}
