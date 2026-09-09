import type { I18nMap, SitePublicPayload } from './types'
import demoSites from './demo-sites.json'

export function loc(map: I18nMap | string | null | undefined, locale = 'ru', fallback = ''): string {
  if (typeof map === 'string') return map
  if (!map || typeof map !== 'object') return fallback
  return map[locale] || map.ru || map.en || map.kk || Object.values(map)[0] || fallback
}

export function vitrinaPageUrl(tenantSlug: string | null, pageSlug: string, locale = 'ru'): string {
  const base = (process.env.NEXT_PUBLIC_VITRINA_URL ?? 'https://vitrina.microp.app').replace(/\/$/, '')
  const tenant = tenantSlug ? `&tenant=${encodeURIComponent(tenantSlug)}` : ''
  return `${base}/p/${encodeURIComponent(pageSlug)}?embed=1&embedView=info&lang=${locale}${tenant}`
}

export function vitrinaHubUrl(tenantSlug: string | null): string | null {
  if (!tenantSlug) return null
  const base = (process.env.NEXT_PUBLIC_VITRINA_URL ?? 'https://vitrina.microp.app').replace(/\/$/, '')
  return `${base}/h/${encodeURIComponent(tenantSlug)}`
}

export async function fetchSitePayload(slug: string): Promise<SitePublicPayload | null> {
  const demoMode = process.env.TOURHUB_DATA_MODE !== 'live'
  if (demoMode) {
    const demo = (demoSites as { sites: SitePublicPayload[] }).sites.find((s) => s.site.slug === slug)
    return demo ?? null
  }

  const hub = (process.env.MEGA_HUB_API_URL ?? 'https://hub.microp.app').replace(/\/$/, '')
  const res = await fetch(`${hub}/api/sites/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`hub sites ${res.status}`)
  return (await res.json()) as SitePublicPayload
}
