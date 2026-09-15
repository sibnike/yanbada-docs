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
    title?: Record<string, string>
    body?: string
    kind?: 'article' | 'faq' | 'rule'
  }
  if (!body.title || typeof body.body !== 'string' || !body.body.trim()) {
    return NextResponse.json({ error: 'title и body обязательны' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: site } = await supabase.schema('hub').from('sites').select('*').eq('slug', slug).maybeSingle()
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  parseSiteRow(site as Record<string, unknown>)

  const { data, error } = await supabase
    .schema('hub')
    .from('site_knowledge')
    .insert({
      site_id: (site as { id: string }).id,
      title: body.title,
      body: body.body.trim(),
      kind: body.kind ?? 'article',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ knowledge: data }, { status: 201 })
}
