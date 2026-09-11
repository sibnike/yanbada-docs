import { NextResponse, type NextRequest } from 'next/server'
import { getSiteByHost } from '@/lib/sites/get-site'

/**
 * Insert into mega-hub/middleware.ts BEFORE marketplace rewrite:
 *   const siteRewrite = await rewritePublicSite(request, normalizedHost, pathname)
 *   if (siteRewrite) return withAuthRefresh(request, host, () => siteRewrite)
 *
 * Order: /s/* path → next; custom_domain/subdomain of hub.sites → /s/{slug}; then events; then /m.
 */
export async function rewritePublicSite(
  request: NextRequest,
  normalizedHost: string,
  pathname: string
): Promise<NextResponse | null> {
  if (pathname.startsWith('/s/') || pathname.startsWith('/api/sites/')) {
    return NextResponse.next({ request })
  }

  const site = await getSiteByHost(normalizedHost)
  if (!site) return null

  const url = request.nextUrl.clone()
  url.pathname = `/s/${site.slug}${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(url)
}
