import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteShell } from '@/components/site-shell'
import { loadPublicPayload } from '@/lib/sites/load'
import { loc } from '@/lib/sites/public-copy'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const payload = await loadPublicPayload(slug)
  if (!payload) return { title: 'Витрина не найдена' }
  const { site } = payload
  return {
    title: loc(site.seo.title, 'ru', loc(site.name, 'ru', site.slug)),
    description: loc(site.seo.description, 'ru', loc(site.description, 'ru')),
    openGraph: site.seo.og_image_url ? { images: [site.seo.og_image_url] } : undefined,
  }
}

export default async function SiteHome({ params }: Params) {
  const { slug } = await params
  const payload = await loadPublicPayload(slug)
  if (!payload) notFound()
  return <SiteShell payload={payload} pageSlug="home" />
}
