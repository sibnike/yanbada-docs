import { notFound } from 'next/navigation'
import { loc, fetchSitePayload } from '@/lib/sites/fetch-site'
import { AssistantDock } from '@/components/sites/assistant-dock'
import '../../../sites.css'

export const dynamic = 'force-dynamic'

type PageProps = { params: { slug: string; postSlug: string } }

export default async function SitePostPage({ params }: PageProps) {
  const payload = await fetchSitePayload(params.slug)
  if (!payload) notFound()
  const post = payload.posts.find((p) => p.slug === params.postSlug)
  if (!post) notFound()
  const assistantName = loc(payload.site.settings.assistant?.name, 'ru', 'Менеджер')
  const greeting = loc(
    payload.site.settings.assistant?.greeting,
    'ru',
    'Могу помочь найти оператора, услугу или материал этого сайта.'
  )
  return (
    <div className={`th-site ${payload.site.template === 'operator' ? 'th-site--operator' : 'th-site--destination'}`}>
      <article className="th-dest-ops" style={{ maxWidth: 720 }}>
        <p className="th-kicker">Журнал</p>
        <h1>{loc(post.title, 'ru')}</h1>
        <p>{loc(post.body, 'ru')}</p>
        <p>
          <a href={`/s/${payload.site.slug}`}>Назад на сайт</a>
        </p>
      </article>
      {payload.site.settings.assistant?.enabled === false ? null : (
        <AssistantDock slug={payload.site.slug} name={assistantName} greeting={greeting} />
      )}
    </div>
  )
}
