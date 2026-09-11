import type { I18nMap } from '@/types/hub-event'
import type {
  PlacementMode,
  PricingModel,
  SiteRow,
  SiteSeo,
  SiteSettings,
  SiteTemplate,
} from '@/types/site'

const TEMPLATES: SiteTemplate[] = ['operator', 'destination']
const PLACEMENT_MODES: PlacementMode[] = ['scope', 'approved', 'mixed']
const PRICING_MODELS: PricingModel[] = ['free', 'monthly', 'commission', 'hybrid']

function asI18n(raw: unknown): I18nMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: I18nMap = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && v.trim()) out[k] = v
  }
  return out
}

function asStringArray(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string' && v.length > 0) : []
}

export function parseSiteSettings(raw: unknown): SiteSettings {
  if (!raw || typeof raw !== 'object') return {}
  const s = raw as Record<string, unknown>
  const mapCenter =
    s.map_center && typeof s.map_center === 'object'
      ? (s.map_center as { lat?: unknown; lng?: unknown; zoom?: unknown })
      : null

  return {
    logo_url: typeof s.logo_url === 'string' ? s.logo_url : undefined,
    favicon_url: typeof s.favicon_url === 'string' ? s.favicon_url : undefined,
    accent_color: typeof s.accent_color === 'string' ? s.accent_color : undefined,
    brand_color: typeof s.brand_color === 'string' ? s.brand_color : undefined,
    hero_image_url: typeof s.hero_image_url === 'string' ? s.hero_image_url : undefined,
    hero_title: asI18n(s.hero_title),
    hero_subtitle: asI18n(s.hero_subtitle),
    intro: asI18n(s.intro),
    footer_text: asI18n(s.footer_text),
    display_name: asI18n(s.display_name),
    map_center:
      mapCenter && typeof mapCenter.lat === 'number' && typeof mapCenter.lng === 'number'
        ? {
            lat: mapCenter.lat,
            lng: mapCenter.lng,
            zoom: typeof mapCenter.zoom === 'number' ? mapCenter.zoom : undefined,
          }
        : undefined,
    assistant: parseAssistant(s.assistant),
  }
}

function parseAssistant(raw: unknown): SiteSettings['assistant'] {
  if (!raw || typeof raw !== 'object') return undefined
  const a = raw as Record<string, unknown>
  return {
    enabled: a.enabled !== false,
    name: asI18n(a.name),
    greeting: asI18n(a.greeting),
  }
}

export function parseSiteRow(data: Record<string, unknown>): SiteRow {
  const template = TEMPLATES.includes(data.template as SiteTemplate)
    ? (data.template as SiteTemplate)
    : 'destination'

  return {
    id: String(data.id),
    slug: String(data.slug),
    name: asI18n(data.name),
    description: data.description ? asI18n(data.description) : null,
    template,
    tenant_ids: asStringArray(data.tenant_ids),
    theme_slugs: asStringArray(data.theme_slugs),
    country_codes: asStringArray(data.country_codes).map((c) => c.toUpperCase()),
    city_codes: asStringArray(data.city_codes).map((c) => c.toLowerCase()),
    marketplace_slug: typeof data.marketplace_slug === 'string' ? data.marketplace_slug : null,
    featured_listing_ids: asStringArray(data.featured_listing_ids),
    subdomain: typeof data.subdomain === 'string' ? data.subdomain : null,
    custom_domain: typeof data.custom_domain === 'string' ? data.custom_domain : null,
    settings: parseSiteSettings(data.settings),
    is_active: data.is_active !== false,
    created_at: String(data.created_at ?? ''),
    updated_at: String(data.updated_at ?? ''),
    placement_mode: PLACEMENT_MODES.includes(data.placement_mode as PlacementMode)
      ? (data.placement_mode as PlacementMode)
      : 'scope',
    pricing_model: PRICING_MODELS.includes(data.pricing_model as PricingModel)
      ? (data.pricing_model as PricingModel)
      : 'free',
    default_currency: typeof data.default_currency === 'string' ? data.default_currency : 'KGS',
    platform_fee_percent: Number(data.platform_fee_percent) || 0,
    commission_percent: Number(data.commission_percent) || 0,
    accepts_requests: data.accepts_requests === true,
    max_cards_per_tenant:
      typeof data.max_cards_per_tenant === 'number' ? data.max_cards_per_tenant : null,
    locales: asStringArray(data.locales).length > 0 ? asStringArray(data.locales) : ['ru'],
    seo: parseSiteSeo(data.seo),
  }
}

function parseSiteSeo(raw: unknown): SiteSeo {
  if (!raw || typeof raw !== 'object') return {}
  const s = raw as Record<string, unknown>
  return {
    title: asI18n(s.title),
    description: asI18n(s.description),
    og_image_url: typeof s.og_image_url === 'string' ? s.og_image_url : undefined,
  }
}

export function isSiteTemplate(v: unknown): v is SiteTemplate {
  return v === 'operator' || v === 'destination'
}
