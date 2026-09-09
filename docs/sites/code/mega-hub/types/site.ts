/**
 * Copy to mega-hub/types/site.ts (same as docs/sites/types.ts).
 */
export type I18nMap = Record<string, string>

export type SiteTemplate = 'operator' | 'destination'

export type SiteSettings = {
  logo_url?: string
  favicon_url?: string
  accent_color?: string
  brand_color?: string
  hero_image_url?: string
  hero_title?: I18nMap
  hero_subtitle?: I18nMap
  intro?: I18nMap
  footer_text?: I18nMap
  display_name?: I18nMap
  map_center?: { lat: number; lng: number; zoom?: number }
}

export type SiteRow = {
  id: string
  slug: string
  name: I18nMap
  description: I18nMap | null
  template: SiteTemplate
  tenant_ids: string[]
  theme_slugs: string[]
  country_codes: string[]
  city_codes: string[]
  marketplace_slug: string | null
  featured_listing_ids: string[]
  subdomain: string | null
  custom_domain: string | null
  settings: SiteSettings
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SiteListing = {
  id: string
  tenant_id: string
  tenant_slug: string | null
  tenant_name: string | null
  page_slug: string
  title: I18nMap
  short_text: I18nMap
  cover_image_url: string | null
  images: string[]
  price_from: number | null
  price_currency: string | null
  marketplace_themes: string[]
  service_country_code: string | null
  service_city_codes: string[]
  next_departure_date: string | null
  seats_left: number | null
  featured: boolean
}

export type SiteCompany = {
  tenant_id: string
  slug: string | null
  name: string | null
  city: string | null
  country: string | null
  logo_url: string | null
  cover_photo_url: string | null
  short_description: I18nMap | string | null
  about: I18nMap
  gallery: unknown
}

export type SitePublicPayload = {
  site: SiteRow
  listings: SiteListing[]
  companies: SiteCompany[]
}

export function listingMatchesSiteScope(
  listing: {
    tenant_id: string
    marketplace_themes?: string[] | null
    marketplace_slugs?: string[] | null
    service_country_code?: string | null
    service_city_codes?: string[] | null
  },
  company: { country?: string | null; city?: string | null } | null,
  site: Pick<
    SiteRow,
    'tenant_ids' | 'theme_slugs' | 'country_codes' | 'city_codes' | 'marketplace_slug'
  >
): boolean {
  if (site.tenant_ids.length > 0 && !site.tenant_ids.includes(listing.tenant_id)) {
    return false
  }
  if (site.theme_slugs.length > 0) {
    const themes = listing.marketplace_themes ?? []
    if (!site.theme_slugs.some((t) => themes.includes(t))) return false
  }
  if (site.country_codes.length > 0) {
    const country = (listing.service_country_code || company?.country || '').toUpperCase()
    const wanted = site.country_codes.map((c) => c.toUpperCase())
    if (!country || !wanted.includes(country)) return false
  }
  if (site.city_codes.length > 0) {
    const codes = (listing.service_city_codes ?? []).map((c) => c.toLowerCase())
    const companyCity = company?.city?.toLowerCase().trim()
    const wanted = site.city_codes.map((c) => c.toLowerCase())
    const hit =
      wanted.some((c) => codes.includes(c)) ||
      (companyCity ? wanted.includes(companyCity) : false)
    if (!hit) return false
  }
  if (site.marketplace_slug) {
    const slugs = listing.marketplace_slugs ?? []
    if (!slugs.includes(site.marketplace_slug)) return false
  }
  return true
}
