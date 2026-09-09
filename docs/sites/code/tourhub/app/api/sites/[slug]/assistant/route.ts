import { NextRequest, NextResponse } from 'next/server'
import demoSites from '@/lib/sites/demo-sites.json'
import type { AssistantReply, SitePublicPayload } from '@/lib/sites/types'

type RouteContext = { params: { slug: string } }

export async function POST(request: NextRequest, context: RouteContext) {
  const body = (await request.json()) as { message?: string }
  const message = typeof body.message === 'string' ? body.message : ''

  if (process.env.TOURHUB_DATA_MODE !== 'live') {
    const demo = (demoSites as { sites: SitePublicPayload[] }).sites.find((s) => s.site.slug === context.params.slug)
    if (!demo) return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    const listing = demo.listings[0]
    const post = demo.posts[0]
    const reply: AssistantReply = {
      reply: `Я менеджер этого сайта. Ищу по вашему запросу «${message}». Могу открыть карточку услуги или материал журнала.`,
      links: [
        listing
          ? { label: Object.values(listing.title)[0] ?? 'Услуга', href: `#listing-${listing.id}`, kind: 'listing' }
          : undefined,
        post
          ? {
              label: Object.values(post.title)[0] ?? 'Журнал',
              href: `/s/${demo.site.slug}/journal/${post.slug}`,
              kind: 'post',
            }
          : undefined,
      ].filter(Boolean) as AssistantReply['links'],
    }
    return NextResponse.json(reply)
  }

  const hub = (process.env.MEGA_HUB_API_URL ?? 'https://hub.microp.app').replace(/\/$/, '')
  const res = await fetch(`${hub}/api/sites/${encodeURIComponent(context.params.slug)}/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  const text = await res.text()
  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  })
}
