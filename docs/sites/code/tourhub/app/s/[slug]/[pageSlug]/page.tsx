import { notFound } from 'next/navigation'
import { AssistantDock } from '@/components/sites/assistant-dock'
import { SiteCanvas } from '@/components/sites/site-canvas'
import { fetchSitePayload, loc } from '@/lib/sites/fetch-site'
import '../../sites.css'

export const dynamic = 'force-dynamic'

type PageProps = { params: { slug: string; pageSlug: string } }

export default async function ThemedSiteInnerPage({ params }: PageProps) {
  const payload = await fetchSitePayload(params.slug)
  if (!payload) notFound()
  const page = payload.pages.find((p) => p.slug === params.pageSlug)
  if (!page) notFound()
  const assistantName = loc(payload.site.settings.assistant?.name, 'ru', 'Менеджер')
  const greeting = loc(
    payload.site.settings.assistant?.greeting,
    'ru',
    'Могу помочь найти оператора, услугу или материал этого сайта.'
  )
  return (
    <>
      <SiteCanvas payload={payload} pageSlug={params.pageSlug} />
      {payload.site.settings.assistant?.enabled === false ? null : (
        <AssistantDock slug={payload.site.slug} name={assistantName} greeting={greeting} />
      )}
    </>
  )
}
