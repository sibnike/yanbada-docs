import { notFound } from 'next/navigation'
import { AssistantDock } from '@/components/sites/assistant-dock'
import { SiteCanvas } from '@/components/sites/site-canvas'
import { loadPublicSitePayload } from '@/lib/sites/load-public-payload'
import { loc } from '@/lib/sites/public-copy'
import '../../sites.css'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ slug: string; pageSlug: string }> }

export default async function PublicSiteInnerPage({ params }: PageProps) {
  const { slug, pageSlug } = await params
  const payload = await loadPublicSitePayload(slug)
  if (!payload) notFound()
  if (!payload.pages.find((p) => p.slug === pageSlug)) notFound()

  const assistantName = loc(payload.site.settings.assistant?.name, 'ru', 'Менеджер')
  const greeting = loc(
    payload.site.settings.assistant?.greeting,
    'ru',
    'Могу помочь найти оператора, услугу или материал этого сайта.'
  )

  return (
    <>
      <SiteCanvas payload={payload} pageSlug={pageSlug} />
      {payload.site.settings.assistant?.enabled === false ? null : (
        <AssistantDock slug={payload.site.slug} name={assistantName} greeting={greeting} />
      )}
    </>
  )
}
