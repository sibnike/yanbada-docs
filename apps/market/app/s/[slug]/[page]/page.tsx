import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteShell } from '@/components/site-shell'
import { loadPublicPayload } from '@/lib/sites/load'
import { loc } from '@/lib/sites/public-copy'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string; page: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, page } = await params
  const payload = await loadPublicPayload(slug)
  const match = payload?.pages.find((p) => p.slug === page)
  if (!payload || !match) return { title: 'Страница не найдена' }
  return { title: `${loc(match.title, 'ru', page)} — ${loc(payload.site.name, 'ru', slug)}` }
}

export default async function SitePage({ params }: Params) {
  const { slug, page } = await params
  const payload = await loadPublicPayload(slug)
  if (!payload || !payload.pages.some((p) => p.slug === page)) notFound()
  return <SiteShell payload={payload} pageSlug={page} />
}
