import { notFound } from 'next/navigation'
import { getSite, loadPosts } from '@/lib/sites/load'
import { loc } from '@/lib/sites/public-copy'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string; post: string }> }

export default async function JournalPost({ params }: Params) {
  const { slug, post } = await params
  const site = await getSite(slug)
  if (!site) notFound()
  const entry = (await loadPosts(site.id)).find((p) => p.slug === post)
  if (!entry) notFound()

  const accent = site.settings.accent_color || '#1c7c6b'
  return (
    <div className="th-site th-site--destination" style={{ ['--site-accent' as string]: accent }}>
      <header className="th-dest-nav">
        <a href={`/s/${site.slug}`} className="th-dest-brand">
          {loc(site.settings.display_name, 'ru', loc(site.name, 'ru', site.slug))}
        </a>
        <nav>
          <a href={`/s/${site.slug}/journal`}>Журнал</a>
        </nav>
      </header>

      <article className="th-sec">
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
          <a className="th-btn" href={`/s/${site.slug}`}>
            Вернуться в витрину
          </a>
        </p>
      </article>

      <footer className="th-dest-foot">{loc(site.settings.footer_text, 'ru')}</footer>
    </div>
  )
}
