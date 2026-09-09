import { NextRequest, NextResponse } from 'next/server'
import { getActiveSiteBySlug } from '@/lib/sites/get-site'
import { searchSiteListings } from '@/lib/sites/search-site-listings'
import { loadSitePages, loadSitePosts } from '@/lib/sites/load-site-content'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  if (!checkRateLimit(`sites-public:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 })
  }

  const { slug } = await context.params
  const site = await getActiveSiteBySlug(slug)
  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  const [{ listings, companies }, pages, posts] = await Promise.all([
    searchSiteListings(site),
    loadSitePages(site.id),
    loadSitePosts(site.id),
  ])

  return NextResponse.json({ site, listings, companies, pages, posts })
}
