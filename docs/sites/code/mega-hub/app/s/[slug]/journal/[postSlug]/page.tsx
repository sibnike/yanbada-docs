import { notFound } from 'next/navigation'
import { AssistantDock } from '@/components/sites/assistant-dock'
import { SiteFrame, siteNav } from '@/components/sites/site-canvas'
import { loadPublicSitePayload } from '@/lib/sites/load-public-payload'
import { loc } from '@/lib/sites/public-copy'
import '../../../sites.css'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ slug: string; postSlug: string }> }

export default async function PublicSitePostPage({ params }: PageProps) {
  const { slug, postSlug } = await params
  const payload = await loadPublicSitePayload(slug)
  if (!payload) notFound()
  const post = payload.posts.find((p) => p.slug === postSlug)
  if (!post) notFound()

  const assistantName = loc(payload.site.settings.assistant?.name, 'ru', 'Менеджер')
  const greeting = loc(
    payload.site.settings.assistant?.greeting,
    'ru',
    'Могу помочь найти оператора, услугу или материал этого сайта.'
  )

  return (
    <>
      <SiteFrame site={payload.site} nav={siteNav(payload.site, payload.pages)}>
        <article className="th-sec th-article">
          <p className="th-kicker">Журнал</p>
          <h1>{loc(post.title, 'ru')}</h1>
          {post.cover_url ? (
            <div className="th-gallery">
              <div className="th-gallery__item" style={{ backgroundImage: `url(${post.cover_url})` }} />
            </div>
          ) : null}
          <p className="th-lead">{loc(post.excerpt, 'ru')}</p>
          <p>{loc(post.body, 'ru')}</p>
          <p>
            <a className="th-btn" href={`/s/${payload.site.slug}`}>
              Вернуться в витрину
            </a>
          </p>
        </article>
      </SiteFrame>
      {payload.site.settings.assistant?.enabled === false ? null : (
        <AssistantDock slug={payload.site.slug} name={assistantName} greeting={greeting} />
      )}
    </>
  )
}
