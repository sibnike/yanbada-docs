import { NextRequest, NextResponse } from 'next/server'
import { isPlatformAdmin } from '@/lib/auth/current-tenant'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseSiteRow } from '@/lib/sites/parse-site'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  if (!(await isPlatformAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { slug } = await context.params
  const body = (await request.json()) as {
    slug?: string
    title?: Record<string, string>
    excerpt?: Record<string, string>
    body?: Record<string, string>
    cover_url?: string
    is_published?: boolean
  }
  const postSlug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(postSlug) || !body.title) {
    return NextResponse.json({ error: 'slug и title обязательны' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: site } = await supabase.schema('hub').from('sites').select('*').eq('slug', slug).maybeSingle()
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  parseSiteRow(site as Record<string, unknown>)

  const published = body.is_published !== false
  const { data, error } = await supabase
    .schema('hub')
    .from('site_posts')
    .insert({
      site_id: (site as { id: string }).id,
      slug: postSlug,
      title: body.title,
      excerpt: body.excerpt ?? {},
      body: body.body ?? {},
      cover_url: body.cover_url ?? null,
      is_published: published,
      published_at: published ? new Date().toISOString() : null,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ post: data }, { status: 201 })
}
