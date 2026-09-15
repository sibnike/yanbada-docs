import { notFound } from 'next/navigation'
import { SiteFrame, siteNav } from '@/components/sites/site-canvas'
import { loadPublicPayload } from '@/lib/sites/load'
import { loc } from '@/lib/sites/public-copy'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string; post: string }> }

export default async function JournalPost({ params }: Params) {
  const { slug, post } = await params
  const payload = await loadPublicPayload(slug)
  if (!payload) notFound()
  const entry = payload.posts.find((p) => p.slug === post)
  if (!entry) notFound()

  return (
    <SiteFrame site={payload.site} nav={siteNav(payload.site, payload.pages)}>
      <article className="th-sec th-article">
        <p className="th-kicker">Журнал витрины</p>
        <h1>{loc(entry.title, 'ru')}</h1>
        {entry.cover_url ? (
          <div className="th-gallery">
            <div className="th-gallery__item" style={{ backgroundImage: `url(${entry.cover_url})` }} />
          </div>
        ) : null}
        <p className="th-lead">{loc(entry.excerpt, 'ru')}</p>
        <p>{loc(entry.body, 'ru')}</p>
        <p>
          <a className="th-btn" href={`/s/${payload.site.slug}`}>
            Вернуться в витрину
          </a>
        </p>
      </article>
    </SiteFrame>
  )
}
