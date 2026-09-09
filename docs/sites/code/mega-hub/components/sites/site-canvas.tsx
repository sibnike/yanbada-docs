import { JoinForm } from '@/components/sites/join-form'
import { loc, vitrinaHubUrl, vitrinaPageUrl } from '@/lib/sites/public-copy'
import type {
  I18nMap,
  SiteBlock,
  SiteCompany,
  SiteListing,
  SiteManualCard,
  SitePlan,
  SitePost,
  SitePublicPayload,
} from '@/types/site'

function money(value: number | null, currency: string | null): string | null {
  if (value == null) return null
  const code = currency || 'KGS'
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${value} ${code}`
  }
}

type BlockList = Array<Record<string, unknown>>

function items(block: SiteBlock): BlockList {
  return Array.isArray(block.payload.items) ? (block.payload.items as BlockList) : []
}

function blockTitle(block: SiteBlock, locale: string, fallback = ''): string {
  return loc(block.payload.title as I18nMap, locale, fallback)
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
  const { site, pages } = payload
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
        <BlockView key={block.id} block={block} payload={payload} locale={locale} />
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
  locale,
}: {
  block: SiteBlock
  payload: SitePublicPayload
  locale: string
}) {
  const { site, companies, listings, posts, plans, manual_cards: manualCards } = payload

  switch (block.type) {
    case 'hero': {
      const hero = site.settings.hero_image_url
      const title = loc(site.settings.hero_title, locale, loc(site.name, locale))
      const subtitle = loc(site.settings.hero_subtitle, locale, loc(site.description, locale))
      const actions = Array.isArray(block.payload.actions) ? (block.payload.actions as BlockList) : []
      return (
        <section
          className={site.template === 'operator' ? 'th-op-hero' : 'th-dest-hero'}
          style={hero ? { backgroundImage: `url(${hero})` } : undefined}
        >
          {site.template === 'operator' ? <div className="th-op-hero__veil" /> : null}
          <div className={site.template === 'operator' ? 'th-op-hero__copy' : 'th-dest-hero__copy'}>
            <p className="th-kicker th-kicker--light">{loc(site.settings.display_name, locale, 'Витрина')}</p>
            <h1>{title}</h1>
            {subtitle ? <p className="th-lead">{subtitle}</p> : null}
            {actions.length > 0 ? (
              <div className="th-hero-actions">
                {actions.map((action, i) => (
                  <a key={i} className="th-btn" href={String(action.href ?? '#')}>
                    {loc(action.label as I18nMap, locale, 'Смотреть')}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      )
    }

    case 'info':
      return (
        <section className="th-sec">
          <p className="th-kicker">{loc(site.settings.display_name, locale, 'О витрине')}</p>
          <h2>{blockTitle(block, locale)}</h2>
          <p className="th-lead">{loc(block.payload.body as I18nMap, locale)}</p>
        </section>
      )

    case 'stats':
      return (
        <section className="th-sec th-stats">
          {items(block).map((item, i) => (
            <div key={i} className="th-stat">
              <strong>{String(item.value ?? '')}</strong>
              <span>{loc(item.label as I18nMap, locale)}</span>
            </div>
          ))}
        </section>
      )

    case 'steps':
      return (
        <section className="th-sec">
          <h2>{blockTitle(block, locale, 'Как это работает')}</h2>
          <ol className="th-steps">
            {items(block).map((item, i) => (
              <li key={i}>
                <strong>{loc(item.title as I18nMap, locale)}</strong>
                <p>{loc(item.body as I18nMap, locale)}</p>
              </li>
            ))}
          </ol>
        </section>
      )

    case 'tenant_cards':
      return (
        <section className="th-sec" id={String(block.payload.anchor ?? 'companies')}>
          <p className="th-kicker">Компании витрины</p>
          <h2>{blockTitle(block, locale, 'Кто здесь работает')}</h2>
          <div className="th-grid">
            {companies.map((company) => (
              <CompanyCard key={company.tenant_id} company={company} />
            ))}
          </div>
        </section>
      )

    case 'listing_cards': {
      const themes = Array.isArray(block.payload.themes)
        ? (block.payload.themes as string[])
        : []
      const limit = Number(block.payload.limit) || 12
      const shown = listings
        .filter((l) => themes.length === 0 || l.marketplace_themes.some((t) => themes.includes(t)))
        .slice(0, limit)
      if (shown.length === 0) return null
      return (
        <section className="th-sec" id={String(block.payload.anchor ?? 'listings')}>
          <p className="th-kicker">Живые карточки</p>
          <h2>{blockTitle(block, locale, 'Услуги')}</h2>
          <div className="th-grid">
            {shown.map((listing) => (
              <ListingCard key={listing.id} listing={listing} locale={locale} />
            ))}
          </div>
        </section>
      )
    }

    case 'manual_cards': {
      const limit = Number(block.payload.limit) || 6
      const shown = manualCards.slice(0, limit)
      if (shown.length === 0) return null
      return (
        <section className="th-sec" id="places">
          <p className="th-kicker">{loc(block.payload.note as I18nMap, locale, 'Добавлено автором')}</p>
          <h2>{blockTitle(block, locale, 'Места рядом')}</h2>
          <div className="th-grid">
            {shown.map((card) => (
              <ManualCard key={card.id} card={card} locale={locale} />
            ))}
          </div>
        </section>
      )
    }

    case 'team':
      return (
        <section className="th-sec">
          <p className="th-kicker">Команда витрины</p>
          <h2>{blockTitle(block, locale, 'Команда')}</h2>
          <div className="th-grid">
            {items(block).map((member, i) => (
              <article key={i} className="th-card th-team">
                {member.photo_url ? (
                  <div className="th-team__photo" style={{ backgroundImage: `url(${String(member.photo_url)})` }} />
                ) : null}
                <div className="th-card__body">
                  <h3>{String(member.name ?? '')}</h3>
                  <p className="th-card__op">{loc(member.role as I18nMap, locale)}</p>
                  <p>{loc(member.bio as I18nMap, locale)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )

    case 'posts': {
      const limit = Number(block.payload.limit) || 6
      const shown = posts.slice(0, limit)
      if (shown.length === 0) return null
      return (
        <section className="th-sec" id="journal">
          <p className="th-kicker">Материалы витрины</p>
          <h2>{blockTitle(block, locale, 'Журнал')}</h2>
          <div className="th-grid">
            {shown.map((post) => (
              <PostCard key={post.id} post={post} siteSlug={site.slug} locale={locale} />
            ))}
          </div>
        </section>
      )
    }

    case 'gallery': {
      const images = Array.isArray(block.payload.images) ? (block.payload.images as string[]) : []
      if (images.length === 0) return null
      return (
        <section className="th-sec">
          <h2>{blockTitle(block, locale, 'Фото')}</h2>
          <div className="th-gallery">
            {images.map((src, i) => (
              <div key={i} className="th-gallery__item" style={{ backgroundImage: `url(${src})` }} />
            ))}
          </div>
        </section>
      )
    }

    case 'reviews':
      return (
        <section className="th-sec">
          <p className="th-kicker">Отзывы</p>
          <h2>{blockTitle(block, locale, 'Что говорят гости')}</h2>
          <div className="th-grid">
            {items(block).map((review, i) => (
              <blockquote key={i} className="th-card th-review">
                <div className="th-card__body">
                  <p className="th-review__stars">{'★'.repeat(Number(review.rating) || 5)}</p>
                  <p>{loc(review.body as I18nMap, locale)}</p>
                  <cite>{String(review.author ?? '')}</cite>
                </div>
              </blockquote>
            ))}
          </div>
        </section>
      )

    case 'faq':
      return (
        <section className="th-sec">
          <h2>{blockTitle(block, locale, 'Частые вопросы')}</h2>
          <div className="th-faq">
            {items(block).map((item, i) => (
              <details key={i}>
                <summary>{loc(item.q as I18nMap, locale)}</summary>
                <p>{loc(item.a as I18nMap, locale)}</p>
              </details>
            ))}
          </div>
        </section>
      )

    case 'map': {
      const center = site.settings.map_center
      if (!center) return null
      const pins = [
        ...payload.listings.map((l) => loc(l.title, locale)),
        ...manualCards.filter((c) => c.geo).map((c) => loc(c.title, locale)),
      ]
      return (
        <section className="th-sec">
          <h2>{blockTitle(block, locale, 'На карте')}</h2>
          <div
            className="th-map"
            data-lat={center.lat}
            data-lng={center.lng}
            data-zoom={center.zoom ?? 11}
          >
            <p>
              {center.lat.toFixed(3)}, {center.lng.toFixed(3)} · {pins.length} точек
            </p>
          </div>
        </section>
      )
    }

    case 'contacts':
      return (
        <section className="th-sec">
          <h2>{blockTitle(block, locale, 'Связаться')}</h2>
          <ul className="th-contacts">
            {items(block).map((item, i) => {
              const raw = item.value
              const value = typeof raw === 'string' ? raw : loc(raw as I18nMap, locale)
              return (
                <li key={i}>
                  <span>{String(item.kind ?? '')}</span>
                  <strong>{value}</strong>
                </li>
              )
            })}
          </ul>
        </section>
      )

    case 'partners':
      return (
        <section className="th-sec">
          <h2>{blockTitle(block, locale, 'Партнёры')}</h2>
          <div className="th-partners">
            {items(block).map((partner, i) => (
              <div key={i} className="th-partners__item">
                {partner.logo_url ? (
                  <img src={String(partner.logo_url)} alt={String(partner.name ?? '')} />
                ) : (
                  <span>{String(partner.name ?? '')}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )

    case 'video': {
      const url = typeof block.payload.url === 'string' ? block.payload.url : ''
      if (!url) return null
      const poster = typeof block.payload.poster_url === 'string' ? block.payload.poster_url : ''
      return (
        <section className="th-sec">
          <h2>{blockTitle(block, locale, 'Видео')}</h2>
          <a
            className="th-video"
            href={url}
            target="_blank"
            rel="noreferrer"
            style={poster ? { backgroundImage: `url(${poster})` } : undefined}
          >
            <span className="th-video__play">▶</span>
          </a>
        </section>
      )
    }

    case 'pricing': {
      if (plans.length === 0) return null
      return (
        <section className="th-sec" id="pricing">
          <p className="th-kicker">Размещение</p>
          <h2>{blockTitle(block, locale, 'Тарифы')}</h2>
          <p>{loc(block.payload.note as I18nMap, locale)}</p>
          <div className="th-grid">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} locale={locale} />
            ))}
          </div>
        </section>
      )
    }

    case 'join': {
      if (!site.accepts_requests) return null
      return (
        <section className="th-sec" id="join">
          <p className="th-kicker">Для компаний</p>
          <h2>{blockTitle(block, locale, 'Заявка на размещение')}</h2>
          <p>{loc(block.payload.body as I18nMap, locale)}</p>
          <JoinForm
            siteSlug={site.slug}
            plans={plans}
            locale={locale}
            terms={loc(block.payload.terms as I18nMap, locale)}
            requireTerms={block.payload.require_terms === true}
          />
        </section>
      )
    }

    case 'cta': {
      const action = (block.payload.action ?? {}) as Record<string, unknown>
      return (
        <section className="th-sec th-cta">
          <div>
            <h2>{blockTitle(block, locale)}</h2>
            <p>{loc(block.payload.body as I18nMap, locale)}</p>
          </div>
          {action.href ? (
            <a className="th-btn" href={String(action.href)}>
              {loc(action.label as I18nMap, locale, 'Подробнее')}
            </a>
          ) : null}
        </section>
      )
    }

    default:
      return null
  }
}

function CompanyCard({ company }: { company: SiteCompany }) {
  return (
    <article className="th-card">
      <div
        className="th-card__media"
        style={company.cover_photo_url ? { backgroundImage: `url(${company.cover_photo_url})` } : undefined}
      />
      <div className="th-card__body">
        <h3>{company.name}</h3>
        <p>{[company.city, company.country].filter(Boolean).join(', ')}</p>
        {company.slug ? (
          <a className="th-btn th-btn--wide" href={vitrinaHubUrl(company.slug) ?? '#'}>
            Профиль компании
          </a>
        ) : null}
      </div>
    </article>
  )
}

function ListingCard({ listing, locale }: { listing: SiteListing; locale: string }) {
  const price = money(listing.price_from, listing.price_currency)
  return (
    <article id={`listing-${listing.id}`} className={`th-card${listing.featured ? ' th-card--featured' : ''}`}>
      <div
        className="th-card__media"
        style={listing.cover_image_url ? { backgroundImage: `url(${listing.cover_image_url})` } : undefined}
      />
      <div className="th-card__body">
        <p className="th-card__op">{listing.tenant_name}</p>
        <h3>{loc(listing.title, locale)}</h3>
        <p>{loc(listing.short_text, locale)}</p>
        <div className="th-card__meta">
          {price ? <strong>{price}</strong> : <span>По запросу</span>}
          {listing.seats_left != null ? <span>мест: {listing.seats_left}</span> : null}
        </div>
        <a className="th-btn th-btn--wide" href={vitrinaPageUrl(listing.tenant_slug, listing.page_slug, locale)}>
          Подробнее и бронь
        </a>
      </div>
    </article>
  )
}

function ManualCard({ card, locale }: { card: SiteManualCard; locale: string }) {
  const price = money(card.price_from, card.currency)
  return (
    <article className="th-card">
      <div
        className="th-card__media"
        style={card.images[0] ? { backgroundImage: `url(${card.images[0]})` } : undefined}
      />
      <div className="th-card__body">
        <h3>{loc(card.title, locale)}</h3>
        <p>{loc(card.body, locale)}</p>
        {price ? <p className="th-card__meta"><strong>{price}</strong></p> : null}
        {card.external_url ? (
          <a className="th-btn th-btn--wide" href={card.external_url} target="_blank" rel="noreferrer">
            Открыть
          </a>
        ) : null}
      </div>
    </article>
  )
}

function PostCard({ post, siteSlug, locale }: { post: SitePost; siteSlug: string; locale: string }) {
  return (
    <article className="th-card">
      <div
        className="th-card__media"
        style={post.cover_url ? { backgroundImage: `url(${post.cover_url})` } : undefined}
      />
      <div className="th-card__body">
        <h3>{loc(post.title, locale)}</h3>
        <p>{loc(post.excerpt, locale)}</p>
        <a href={`/s/${siteSlug}/journal/${post.slug}`}>Читать</a>
      </div>
    </article>
  )
}

function PlanCard({ plan, locale }: { plan: SitePlan; locale: string }) {
  const price = money(plan.price_per_card, plan.currency)
  const period = plan.period_months === 1 ? 'в месяц' : `за ${plan.period_months} мес.`
  return (
    <article className={`th-card th-plan${plan.slot !== 'standard' ? ' th-card--featured' : ''}`}>
      <div className="th-card__body">
        <h3>{loc(plan.name, locale)}</h3>
        <p className="th-plan__price">
          {plan.price_per_card === 0 ? 'бесплатно' : `${price} ${period}`}
        </p>
        <p>{loc(plan.description, locale)}</p>
        <ul className="th-plan__perks">
          {plan.perks.map((perk, i) => (
            <li key={i}>{perk}</li>
          ))}
        </ul>
        <a className="th-btn th-btn--wide" href="#join">
          Оставить заявку
        </a>
      </div>
    </article>
  )
}
