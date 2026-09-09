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

export function DestinationSite({ payload, locale = 'ru' }: { payload: SitePublicPayload; locale?: string }) {
  const { site, listings, companies } = payload
  const accent = site.settings.accent_color || '#0D9488'
  const hero = site.settings.hero_image_url
  const title = loc(site.settings.hero_title, locale, loc(site.name, locale))
  const subtitle = loc(site.settings.hero_subtitle, locale, loc(site.description, locale))
  const vars = { '--site-accent': accent } as CSSProperties

  return (
    <div className="th-site th-site--destination" style={vars}>
      <header className="th-dest-nav">
        <span className="th-dest-brand">{loc(site.settings.display_name, locale, loc(site.name, locale))}</span>
        <nav>
          <a href="#operators">Операторы</a>
          <a href="#routes">Маршруты</a>
        </nav>
      </header>

      <section className="th-dest-hero" style={hero ? { backgroundImage: `url(${hero})` } : undefined}>
        <div className="th-dest-hero__copy">
          <p className="th-kicker th-kicker--light">Направление</p>
          <h1>{title}</h1>
          {subtitle ? <p className="th-lead">{subtitle}</p> : null}
          <div className="th-dest-chips">
            {site.country_codes.map((c) => (
              <span key={c} className="th-chip th-chip--light">
                {c}
              </span>
            ))}
            {site.city_codes.map((c) => (
              <span key={c} className="th-chip th-chip--light">
                {c}
              </span>
            ))}
            {site.theme_slugs.map((t) => (
              <span key={t} className="th-chip th-chip--light">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="operators" className="th-dest-ops">
        <p className="th-kicker">Кто здесь работает</p>
        <h2>Операторы направления</h2>
        <div className="th-dest-ops__grid">
          {companies.map((company) => (
            <article key={company.tenant_id} className="th-dest-op">
              <div
                className="th-dest-op__cover"
                style={company.cover_photo_url ? { backgroundImage: `url(${company.cover_photo_url})` } : undefined}
              />
              <div className="th-dest-op__body">
                <h3>{company.name}</h3>
                <p>
                  {[company.city, company.country].filter(Boolean).join(', ')}
                </p>
                {company.slug ? (
                  <a href={vitrinaHubUrl(company.slug) ?? '#'}>Профиль</a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="routes" className="th-dest-routes">
        <p className="th-kicker">Каталог</p>
        <h2>Маршруты и услуги</h2>
        <div className="th-dest-routes__grid">
          {listings.map((listing) => {
            const href = vitrinaPageUrl(listing.tenant_slug, listing.page_slug, locale)
            const price = money(listing.price_from, listing.price_currency)
            return (
              <article key={listing.id} className="th-dest-card">
                <div
                  className="th-dest-card__media"
                  style={listing.cover_image_url ? { backgroundImage: `url(${listing.cover_image_url})` } : undefined}
                />
                <div className="th-dest-card__body">
                  <p className="th-dest-card__op">{listing.tenant_name}</p>
                  <h3>{loc(listing.title, locale)}</h3>
                  <p>{loc(listing.short_text, locale)}</p>
                  <div className="th-dest-card__meta">
                    {price ? <strong>{price}</strong> : <span>По запросу</span>}
                    {listing.service_city_codes[0] ? <span>{listing.service_city_codes[0]}</span> : null}
                  </div>
                  <a className="th-btn th-btn--wide" href={href}>
                    Открыть услугу
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <footer className="th-dest-foot">
        <p>{loc(site.settings.footer_text, locale)}</p>
      </footer>
    </div>
  )
}
