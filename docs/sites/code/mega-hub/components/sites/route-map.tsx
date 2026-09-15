'use client'

import { useEffect, useMemo, useRef } from 'react'
import { loc } from '@/lib/sites/public-copy'
import type { ListingItineraryStop, SiteListing } from '@/types/site'
import { useSelectedTour } from '@/components/sites/tour-select'

type Pin = { lat: number; lng: number; title: string; kind: 'stop' | 'tour' }

function pinsFromItinerary(stops: ListingItineraryStop[]): Pin[] {
  return stops.map((stop) => ({
    lat: stop.lat,
    lng: stop.lng,
    title: stop.title || `День ${stop.day}`,
    kind: 'stop',
  }))
}

export function RouteMap({
  listings,
  locale = 'ru',
  title,
  mode = 'all',
  anchor = 'route',
  center,
  embed = false,
}: {
  listings: SiteListing[]
  locale?: string
  title: string
  mode?: 'all' | 'selected'
  anchor?: string
  center?: { lat: number; lng: number; zoom?: number } | null
  embed?: boolean
}) {
  const selected = useSelectedTour(listings)
  const stops = mode === 'selected' ? selected?.itinerary ?? [] : []
  const pins: Pin[] =
    mode === 'selected'
      ? pinsFromItinerary(stops)
      : listings.flatMap((listing) => {
          if (listing.itinerary.length > 0) return pinsFromItinerary(listing.itinerary)
          return []
        })

  const subtitle =
    mode === 'selected'
      ? selected
        ? loc(selected.title, locale)
        : 'Выберите тур в подборе'
      : `${listings.filter((l) => l.itinerary.length > 0).length} маршрутов`

  const map = (
    <>
      <OsmMap
        pins={pins}
        line={mode === 'selected' ? stops : []}
        center={center}
        highlight={mode === 'all' ? selected?.itinerary ?? [] : []}
      />
      {mode === 'selected' && stops.length > 0 ? (
        <ol className="th-route-list">
          {stops.map((stop, i) => (
            <li key={`${stop.lat}-${i}`}>
              <strong>День {stop.day}.</strong> {stop.title}
              {stop.note ? <span> — {stop.note}</span> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </>
  )

  if (embed) return <div className="th-picker__map">{map}</div>

  return (
    <section className="th-sec" id={anchor}>
      <p className="th-kicker">Маршрут из Vitrina</p>
      <h2>{title}</h2>
      <p className="th-lead">{subtitle}</p>
      {map}
    </section>
  )
}

function OsmMap({
  pins,
  line,
  highlight,
  center,
}: {
  pins: Pin[]
  line: ListingItineraryStop[]
  highlight: ListingItineraryStop[]
  center?: { lat: number; lng: number; zoom?: number } | null
}) {
  const host = useRef<HTMLDivElement>(null)
  const key = useMemo(
    () =>
      JSON.stringify({
        pins,
        line: line.map((s) => [s.lat, s.lng]),
        highlight: highlight.map((s) => [s.lat, s.lng]),
        center,
      }),
    [pins, line, highlight, center]
  )

  useEffect(() => {
    const el = host.current
    if (!el) return
    let cancelled = false
    let map: LeafletMap | null = null

    async function draw() {
      await loadLeaflet()
      if (cancelled || !el || !window.L) return
      const L = window.L
      const start = line[0] ?? highlight[0] ?? pins[0]
      const lat = start?.lat ?? center?.lat ?? 42.49
      const lng = start?.lng ?? center?.lng ?? 78.39
      map = L.map(el, { scrollWheelZoom: false })
      map.setView([lat, lng], center?.zoom ?? 10)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map as never)

      const bounds: [number, number][] = []
      for (const pin of pins) {
        L.circleMarker([pin.lat, pin.lng], {
          radius: pin.kind === 'stop' ? 7 : 6,
          color: '#1c7c6b',
          fillColor: '#1c7c6b',
          fillOpacity: 0.9,
          weight: 2,
        })
          .bindPopup(pin.title)
          .addTo(map as never)
        bounds.push([pin.lat, pin.lng])
      }
      if (line.length > 1) {
        const latlngs = line.map((s) => [s.lat, s.lng] as [number, number])
        L.polyline(latlngs, { color: '#1c7c6b', weight: 4, opacity: 0.85 }).addTo(map as never)
        bounds.push(...latlngs)
      }
      if (highlight.length > 1) {
        const latlngs = highlight.map((s) => [s.lat, s.lng] as [number, number])
        L.polyline(latlngs, { color: '#b4620f', weight: 5, opacity: 0.9 }).addTo(map as never)
        bounds.push(...latlngs)
      }
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [28, 28] })
      }
    }

    void draw()
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [key, center, highlight, line, pins])

  return <div ref={host} className="th-map th-map--live" />
}

type LeafletMap = {
  setView: (c: [number, number], z: number) => unknown
  remove: () => void
  fitBounds: (b: [number, number][], o: { padding: [number, number] }) => void
}

declare global {
  interface Window {
    L?: {
      map: (el: HTMLElement, opts: { scrollWheelZoom: boolean }) => LeafletMap
      tileLayer: (url: string, opts: { attribution: string }) => { addTo: (map: never) => void }
      circleMarker: (
        c: [number, number],
        opts: Record<string, unknown>
      ) => { bindPopup: (t: string) => { addTo: (map: never) => void } }
      polyline: (c: [number, number][], opts: Record<string, unknown>) => { addTo: (map: never) => void }
    }
  }
}

function loadLeaflet(): Promise<void> {
  if (window.L) return Promise.resolve()
  return new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-hub-leaflet]')) {
      const css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      css.dataset.hubLeaflet = '1'
      document.head.appendChild(css)
    }
    const existing = document.querySelector('script[data-hub-leaflet]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('leaflet')))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.dataset.hubLeaflet = '1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('leaflet'))
    document.body.appendChild(script)
  })
}
