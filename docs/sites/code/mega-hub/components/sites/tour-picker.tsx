'use client'

import { useMemo, useState } from 'react'
import { loc, vitrinaPageUrl } from '@/lib/sites/public-copy'
import type { SiteListing } from '@/types/site'
import { RouteMap } from '@/components/sites/route-map'
import { selectTour } from '@/components/sites/tour-select'

function money(value: number | null, currency: string | null): string {
  if (value == null) return 'по запросу'
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

export function TourPicker({
  listings,
  locale = 'ru',
  title,
  layout = 'split',
  limit = 24,
  anchor = 'tours',
}: {
  listings: SiteListing[]
  locale?: string
  title: string
  layout?: 'dense' | 'split'
  limit?: number
  anchor?: string
}) {
  const themes = useMemo(() => {
    const set = new Set<string>()
    for (const listing of listings) {
      for (const theme of listing.marketplace_themes) set.add(theme)
    }
    return Array.from(set).sort()
  }, [listings])

  const [theme, setTheme] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [selectedId, setSelectedId] = useState(listings[0]?.id ?? '')

  const shown = listings
    .filter((listing) => !theme || listing.marketplace_themes.includes(theme))
    .filter((listing) => !fromDate || (listing.next_departure_date ?? '') >= fromDate)
    .filter((listing) => {
      if (!maxPrice) return true
      if (listing.price_from == null) return false
      return listing.price_from <= Number(maxPrice)
    })
    .slice(0, limit)

  function pick(listing: SiteListing) {
    setSelectedId(listing.id)
    selectTour(listing.id)
  }

  return (
    <section className="th-sec" id={anchor}>
      <p className="th-kicker">Живые туры из Vitrina</p>
      <h2>{title}</h2>
      <div className="th-picker__filters">
        <label>
          Тема
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="">все</option>
            {themes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Дата от
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label>
          Цена до
          <input
            type="number"
            min={0}
            placeholder="любая"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </label>
        <p className="th-picker__count">{shown.length} из {listings.length}</p>
      </div>
      <div className={layout === 'split' ? 'th-picker th-picker--split' : 'th-picker'}>
        <div className="th-picker__grid">
          {shown.map((listing) => (
            <article
              key={listing.id}
              className={`th-offer ${listing.id === selectedId ? 'th-offer--on' : ''}`}
            >
              <button type="button" className="th-offer__hit" onClick={() => pick(listing)}>
                <div
                  className="th-offer__media"
                  style={
                    listing.cover_image_url
                      ? { backgroundImage: `url(${listing.cover_image_url})` }
                      : undefined
                  }
                />
                <div className="th-offer__copy">
                  <p className="th-card__op">{listing.tenant_name}</p>
                  <h3>{loc(listing.title, locale)}</h3>
                  <p className="th-offer__meta">
                    <strong>{money(listing.price_from, listing.price_currency)}</strong>
                    {listing.next_departure_date ? <span>{listing.next_departure_date}</span> : null}
                    {listing.seats_left != null ? <span>мест: {listing.seats_left}</span> : null}
                  </p>
                </div>
              </button>
              <a
                className="th-btn th-btn--wide"
                href={vitrinaPageUrl(listing.tenant_slug, listing.page_slug, locale)}
              >
                Забронировать
              </a>
            </article>
          ))}
        </div>
        {layout === 'split' ? (
          <RouteMap listings={shown} locale={locale} title="" mode="selected" embed />
        ) : null}
      </div>
    </section>
  )
}
