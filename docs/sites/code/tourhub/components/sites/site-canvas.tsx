import { loc, vitrinaHubUrl, vitrinaPageUrl } from '@/lib/sites/fetch-site'
import type { SiteBlock, SiteCompany, SiteListing, SitePost, SitePublicPayload } from '@/lib/sites/types'

function money(value: number | null, currency: string | null): string | null {
  if (value == null) return null
  const code = currency || 'KZT'
  try {
    return new Intl.NumberFormat('ru-KZ', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${value} ${code}`
  }
}

export function SiteCanvas({
  payload,
  pageSlug = 'home',
  locale = 'ru',
}: {
  payload: SitePublicPayload
  pageSlug?: string
  locale?: string
}) {
  const { site, pages, posts, companies, listings } = payload
  const page = pages.find((p) => p.slug === pageSlug) ?? pages.find((p) => p.kind === 'home')
  const skin = site.template === 'operator' ? 'th-site--operator' : 'th-site--destination'
  const accent = site.settings.accent_color || (site.template === 'operator' ? '#C45C26' : '#0D9488')
  const name = loc(site.settings.display_name, locale, loc(site.name, locale))

  return (
    <div className={`th-site ${skin}`} style={{ ['--site-accent' as string]: accent }}>
      <header className={site.template === 'operator' ? 'th-op-nav' : 'th-dest-nav'}>
        <a href={`/s/${site.slug}`} className={site.template === 'operator' ? 'th-op-brand' : 'th-dest-brand'}>
          {name}
        </a>
        <nav>
          {pages.map((p) => (
            <a key={p.id} href={p.slug === 'home' ? `/s/${site.slug}` : `/s/${site.slug}/${p.slug}`}>
              {loc(p.title, locale, p.slug)}
            </a>
          ))}
        </nav>
      </header>

      {(page?.blocks.length ? page.blocks : fallbackBlocks()).map((block) => (
        <BlockView
          key={block.id}
          block={block}
          payload={payload}
          companies={companies}
          listings={listings}
          posts={posts}
          locale={locale}
        />
      ))}

      <footer className={site.template === 'operator' ? 'th-op-foot' : 'th-dest-foot'}>
        {loc(site.settings.footer_text, locale)}
      </footer>
    </div>
  )
}

function fallbackBlocks(): SiteBlock[] {
  return [
    { id: 'hero', page_id: 'home', type: 'hero', payload: { source: 'site_settings' }, sort_order: 0 },
    { id: 'tenants', page_id: 'home', type: 'tenant_cards', payload: { mode: 'scope' }, sort_order: 10 },
    { id: 'listings', page_id: 'home', type: 'listing_cards', payload: { mode: 'scope' }, sort_order: 20 },
  ]
}

function BlockView({
  block,
  payload,
  companies,
  listings,
  posts,
  locale,
}: {
  block: SiteBlock
  payload: SitePublicPayload
  companies: SiteCompany[]
  listings: SiteListing[]
  posts: SitePost[]
  locale: string
}) {
  const site = payload.site
  if (block.type === 'hero') {
    const hero = site.settings.hero_image_url
    const title = loc(site.settings.hero_title, locale, loc(site.name, locale))
    const subtitle = loc(site.settings.hero_subtitle, locale, loc(site.description, locale))
    const cls = site.template === 'operator' ? 'th-op-hero' : 'th-dest-hero'
    return (
      <section className={cls} style={hero ? { backgroundImage: `url(${hero})` } : undefined}>
        {site.template === 'operator' ? <div className="th-op-hero__veil" /> : null}
        <div className={site.template === 'operator' ? 'th-op-hero__copy' : 'th-dest-hero__copy'}>
          <p className="th-kicker">Проект</p>
          <h1>{title}</h1>
          {subtitle ? <p className="th-lead">{subtitle}</p> : null}
        </div>
      </section>
    )
  }

  if (block.type === 'info') {
    const title = loc(block.payload.title as Record<string, string>, locale)
    const body = loc(block.payload.body as Record<string, string>, locale)
    return (
      <section className={site.template === 'operator' ? 'th-op-story' : 'th-dest-ops'}>
        <div>
          <p className="th-kicker">О проекте</p>
          <h2>{title}</h2>
        </div>
        <p className={site.template === 'operator' ? 'th-op-story__text' : undefined}>{body}</p>
      </section>
    )
  }

  if (block.type === 'tenant_cards') {
    return (
      <section className="th-dest-ops" id="operators">
        <p className="th-kicker">Тенанты</p>
        <h2>Карточки компаний</h2>
        <div className="th-dest-ops__grid">
          {companies.map((company) => (
            <article key={company.tenant_id} className="th-dest-op">
              <div
                className="th-dest-op__cover"
                style={company.cover_photo_url ? { backgroundImage: `url(${company.cover_photo_url})` } : undefined}
              />
              <div className="th-dest-op__body">
                <h3>{company.name}</h3>
                <p>{[company.city, company.country].filter(Boolean).join(', ')}</p>
                {company.slug ? <a href={vitrinaHubUrl(company.slug) ?? '#'}>Профиль</a> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    )
  }

  if (block.type === 'listing_cards') {
    return (
      <section className="th-dest-routes" id="routes">
        <p className="th-kicker">Услуги</p>
        <h2>Живые карточки</h2>
        <div className="th-dest-routes__grid">
          {listings.map((listing) => (
            <article key={listing.id} id={`listing-${listing.id}`} className="th-dest-card">
              <div
                className="th-dest-card__media"
                style={listing.cover_image_url ? { backgroundImage: `url(${listing.cover_image_url})` } : undefined}
              />
              <div className="th-dest-card__body">
                <p className="th-dest-card__op">{listing.tenant_name}</p>
                <h3>{loc(listing.title, locale)}</h3>
                <p>{loc(listing.short_text, locale)}</p>
                <div className="th-dest-card__meta">
                  {money(listing.price_from, listing.price_currency) ? (
                    <strong>{money(listing.price_from, listing.price_currency)}</strong>
                  ) : (
                    <span>По запросу</span>
                  )}
                </div>
                <a className="th-btn th-btn--wide" href={vitrinaPageUrl(listing.tenant_slug, listing.page_slug, locale)}>
                  Подробнее и бронь
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    )
  }

  if (block.type === 'posts') {
    return (
      <section className="th-dest-ops" id="journal">
        <p className="th-kicker">Материалы проекта</p>
        <h2>Журнал</h2>
        <div className="th-dest-ops__grid">
          {posts.map((post) => (
            <article key={post.id} className="th-dest-card">
              <div className="th-dest-card__body">
                <h3>{loc(post.title, locale)}</h3>
                <p>{loc(post.excerpt, locale)}</p>
                <a href={`/s/${site.slug}/journal/${post.slug}`}>Читать</a>
              </div>
            </article>
          ))}
        </div>
      </section>
    )
  }

  return null
}
