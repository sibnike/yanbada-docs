import type { CSSProperties } from 'react'
import { loc, vitrinaHubUrl, vitrinaPageUrl } from '@/lib/sites/fetch-site'
import type { SitePublicPayload } from '@/lib/sites/types'

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

export function OperatorSite({ payload, locale = 'ru' }: { payload: SitePublicPayload; locale?: string }) {
  const { site, listings, companies } = payload
  const company = companies[0]
  const accent = site.settings.accent_color || '#C45C26'
  const hero = site.settings.hero_image_url || listings[0]?.cover_image_url || company?.cover_photo_url
  const title = loc(site.settings.hero_title, locale, loc(site.name, locale))
  const subtitle = loc(site.settings.hero_subtitle, locale, loc(site.description, locale))
  const about = loc(site.settings.intro, locale, loc(company?.about, locale, ''))
  const vars = { '--site-accent': accent } as CSSProperties

  return (
    <div className="th-site th-site--operator" style={vars}>
      <header className="th-op-nav">
        <span className="th-op-brand">{loc(site.settings.display_name, locale, loc(site.name, locale))}</span>
        <nav>
          <a href="#story">История</a>
          <a href="#tours">Программы</a>
        </nav>
      </header>

      <section className="th-op-hero" style={hero ? { backgroundImage: `url(${hero})` } : undefined}>
        <div className="th-op-hero__veil" />
        <div className="th-op-hero__copy">
          <p className="th-kicker">{company?.city ? company.city : 'Студия маршрута'}</p>
          <h1>{title}</h1>
          {subtitle ? <p className="th-lead">{subtitle}</p> : null}
          {listings[0] ? (
            <a className="th-btn th-btn--light" href="#tours">
              Смотреть программы
            </a>
          ) : null}
        </div>
      </section>

      <section id="story" className="th-op-story">
        <div>
          <p className="th-kicker">О нас</p>
          <h2>Не launcher. Бренд.</h2>
        </div>
        <p className="th-op-story__text">{about}</p>
      </section>

      <section id="tours" className="th-op-tours">
        <p className="th-kicker">Программы</p>
        <h2>Ближайшие выезды</h2>
        <div className="th-op-tours__list">
          {listings.map((listing) => {
            const href = vitrinaPageUrl(listing.tenant_slug, listing.page_slug, locale)
            const price = money(listing.price_from, listing.price_currency)
            return (
              <article key={listing.id} className="th-op-card">
                <div
                  className="th-op-card__media"
                  style={listing.cover_image_url ? { backgroundImage: `url(${listing.cover_image_url})` } : undefined}
                />
                <div className="th-op-card__body">
                  {listing.featured ? <span className="th-chip">Избранное</span> : null}
                  <h3>{loc(listing.title, locale)}</h3>
                  <p>{loc(listing.short_text, locale)}</p>
                  <div className="th-op-card__meta">
                    {price ? <strong>{price}</strong> : null}
                    {listing.next_departure_date ? <span>Ближайшая дата {listing.next_departure_date}</span> : null}
                  </div>
                  <a className="th-btn" href={href}>
                    Подробнее и бронь
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <footer className="th-op-foot">
        {company?.slug ? <a href={vitrinaHubUrl(company.slug) ?? '#'}>Внутренний хаб тенанта</a> : null}
        <p>{loc(site.settings.footer_text, locale)}</p>
      </footer>
    </div>
  )
}
