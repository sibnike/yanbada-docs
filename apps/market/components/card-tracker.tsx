'use client'

import { useEffect } from 'react'

/**
 * Impressions and clicks per placed card. This is the number the tenant looks
 * at before renewing, so it has to come from real traffic, not a seed.
 */
export function CardTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const ids = Array.from(document.querySelectorAll('[id^="listing-"]'))
      .map((node) => node.id.replace('listing-', ''))
      .filter(Boolean)

    if (ids.length > 0) {
      void send(slug, { event: 'impression', listing_ids: ids })
    }

    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      const card = target?.closest('[id^="listing-"]') as HTMLElement | null
      if (!card) return
      const listingId = card.id.replace('listing-', '')
      const booking = (target?.closest('a') as HTMLAnchorElement | null)?.href.includes('/p/')
      void send(slug, {
        event: booking ? 'booking_hit' : 'click',
        listing_ids: [listingId],
      })
    }

    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [slug])

  return null
}

function send(slug: string, body: Record<string, unknown>): Promise<unknown> {
  return fetch(`/api/sites/${encodeURIComponent(slug)}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => null)
}
