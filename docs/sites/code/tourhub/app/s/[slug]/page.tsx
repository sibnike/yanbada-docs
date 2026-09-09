import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DestinationSite } from '@/components/sites/destination-site'
import { OperatorSite } from '@/components/sites/operator-site'
import { fetchSitePayload, loc } from '@/lib/sites/fetch-site'
import './sites.css'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const payload = await fetchSitePayload(params.slug)
  if (!payload) return { title: 'Site' }
  return {
    title: loc(payload.site.settings.display_name, 'ru', loc(payload.site.name, 'ru')),
    description: loc(payload.site.description, 'ru'),
  }
}

export default async function ThemedSitePage({ params }: PageProps) {
  const payload = await fetchSitePayload(params.slug)
  if (!payload) notFound()

  if (payload.site.template === 'operator') {
    return <OperatorSite payload={payload} />
  }
  return <DestinationSite payload={payload} />
}
