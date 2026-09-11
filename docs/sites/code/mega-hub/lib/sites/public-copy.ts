import type { I18nMap } from '@/types/site'

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
