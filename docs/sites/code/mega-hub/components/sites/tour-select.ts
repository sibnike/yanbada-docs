'use client'

import { useEffect, useState } from 'react'
import type { SiteListing } from '@/types/site'

const SELECT_EVENT = 'hub:select-tour'

export function selectTour(listingId: string | null) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SELECT_EVENT, { detail: listingId }))
}

export function useSelectedTour(listings: SiteListing[]): SiteListing | null {
  const [id, setId] = useState<string | null>(listings[0]?.id ?? null)
  useEffect(() => {
    const onSelect = (event: Event) => {
      setId((event as CustomEvent<string | null>).detail)
    }
    window.addEventListener(SELECT_EVENT, onSelect)
    return () => window.removeEventListener(SELECT_EVENT, onSelect)
  }, [])
  return listings.find((item) => item.id === id) ?? listings[0] ?? null
}
