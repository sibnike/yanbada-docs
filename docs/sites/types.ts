/**
 * Shared types for hub.sites (mega-hub constructor + public /s/{slug}).
 * Copy into mega-hub/types/site.ts
 */

export type I18nMap = Record<string, string>

/** Visual skin only. Layout comes from constructor blocks. */
export type SiteTemplate = 'operator' | 'destination'

export type SitePageKind = 'home' | 'page' | 'blog'
export type SiteBlockType =
  | 'hero'
  | 'info'
  | 'stats'
  | 'steps'
  | 'tenant_cards'
  | 'listing_cards'
  | 'manual_cards'
  | 'team'
  | 'posts'
  | 'gallery'
  | 'reviews'
  | 'faq'
  | 'map'
  | 'contacts'
  | 'partners'
  | 'video'
  | 'pricing'
  | 'join'
  | 'cta'
export type SiteKnowledgeKind = 'article' | 'faq' | 'rule'

/** How cards get onto the page. approved = paid market. */
export type PlacementMode = 'scope' | 'approved' | 'mixed'
export type PricingModel = 'free' | 'monthly' | 'commission' | 'hybrid'
export type PlacementSlot = 'standard' | 'featured' | 'pinned'
export type PlacementStatus = 'active' | 'pending_payment' | 'paused' | 'expired' | 'hidden'
export type PlacementRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type SiteMemberRole = 'owner' | 'editor' | 'moderator'

export type SiteAssistantSettings = {
  enabled?: boolean
  name?: I18nMap
  greeting?: I18nMap
}

export type SiteSeo = {
  title?: I18nMap
  description?: I18nMap
  og_image_url?: string
}

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
  assistant?: SiteAssistantSettings
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
  placement_mode: PlacementMode
  pricing_model: PricingModel
  default_currency: string
  platform_fee_percent: number
  commission_percent: number
  accepts_requests: boolean
  max_cards_per_tenant: number | null
  locales: string[]
  seo: SiteSeo
}

export type SitePlan = {
  id: string
  site_id: string
  slug: string
  name: I18nMap
  description: I18nMap
  price_per_card: number
  currency: string
  period_months: number
  card_quota: number
  slot: PlacementSlot
  trial_days: number
  perks: string[]
  is_public: boolean
  sort_order: number
}

export type SitePlacement = {
  id: string
  site_id: string
  tenant_id: string
  /** null = the company card itself */
  listing_id: string | null
  plan_id: string | null
  slot: PlacementSlot
  sort_weight: number
  status: PlacementStatus
  price_per_period: number
  currency: string
  paid_until: string | null
  grace_days: number
}

export type SiteManualCard = {
  id: string
  site_id: string
  kind: 'place' | 'service' | 'company'
  title: I18nMap
  body: I18nMap
  images: string[]
  price_from: number | null
  currency: string | null
  city_code: string | null
  geo: { lat: number; lng: number } | null
  external_url: string | null
  claim_status: 'unclaimed' | 'requested' | 'claimed'
  sort_order: number
}

export type SitePlacementRequest = {
  id: string
  site_id: string
  tenant_id: string
  plan_id: string | null
  direction: 'tenant_request' | 'owner_invite'
  listing_ids: string[]
  include_company: boolean
  message: string | null
  contact: Record<string, string>
  status: PlacementRequestStatus
  reject_reason: string | null
  accepted_terms_at: string | null
  created_at: string
  decided_at: string | null
}

export type SitePage = {
  id: string
  site_id: string
  slug: string
  kind: SitePageKind
  title: I18nMap
  sort_order: number
  is_published: boolean
  blocks: SiteBlock[]
}

export type SiteBlock = {
  id: string
  page_id: string
  type: SiteBlockType
  payload: Record<string, unknown>
  sort_order: number
}

export type SitePost = {
  id: string
  site_id: string
  slug: string
  title: I18nMap
  excerpt: I18nMap
  body: I18nMap
  cover_url: string | null
  published_at: string | null
}

export type SiteKnowledge = {
  id: string
  site_id: string
  title: I18nMap
  body: string
  kind: SiteKnowledgeKind
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
  pages: SitePage[]
  posts: SitePost[]
  plans: SitePlan[]
  manual_cards: SiteManualCard[]
}

export type AssistantLink = {
  label: string
  href: string
  kind: 'listing' | 'company' | 'page' | 'post'
}

export type AssistantReply = {
  reply: string
  links: AssistantLink[]
}

/** Empty array = no filter on that dimension. All non-empty dimensions AND. */
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

/**
 * Active and either free or inside the paid window plus grace.
 * Mirrors hub.placement_is_live so UI and DB agree.
 */
export function placementIsLive(
  placement: Pick<SitePlacement, 'status' | 'paid_until' | 'grace_days'>,
  now: Date = new Date()
): boolean {
  if (placement.status !== 'active') return false
  if (!placement.paid_until) return true
  const until = new Date(placement.paid_until).getTime()
  if (Number.isNaN(until)) return true
  return now.getTime() < until + placement.grace_days * 86_400_000
}

const SLOT_WEIGHT: Record<PlacementSlot, number> = { pinned: 2, featured: 1, standard: 0 }

/**
 * approved: only paid/approved cards. mixed: scope cards allowed, placed ones on top.
 * Returns listings in display order.
 */
export function applyPlacements(
  listings: SiteListing[],
  placements: SitePlacement[],
  mode: PlacementMode,
  now: Date = new Date()
): SiteListing[] {
  if (mode === 'scope') return listings

  const live = placements.filter((p) => placementIsLive(p, now))
  const byListing = new Map(live.filter((p) => p.listing_id).map((p) => [p.listing_id as string, p]))
  const liveTenants = new Set(live.map((p) => p.tenant_id))

  const kept =
    mode === 'approved'
      ? listings.filter((l) => byListing.has(l.id))
      : listings.filter((l) => byListing.has(l.id) || !liveTenants.has(l.tenant_id))

  return kept
    .map((listing) => {
      const placement = byListing.get(listing.id)
      return {
        listing,
        rank: placement ? SLOT_WEIGHT[placement.slot] : -1,
        weight: placement?.sort_weight ?? 0,
      }
    })
    .sort((a, b) => b.rank - a.rank || b.weight - a.weight)
    .map((entry) => ({
      ...entry.listing,
      featured: entry.rank > 0 || entry.listing.featured,
    }))
}

/** Tenants with a live company or listing placement. */
export function placedTenantIds(placements: SitePlacement[], now: Date = new Date()): Set<string> {
  return new Set(placements.filter((p) => placementIsLive(p, now)).map((p) => p.tenant_id))
}

export const SITE_BLOCK_TYPES: SiteBlockType[] = [
  'hero',
  'info',
  'stats',
  'steps',
  'tenant_cards',
  'listing_cards',
  'manual_cards',
  'team',
  'posts',
  'gallery',
  'reviews',
  'faq',
  'map',
  'contacts',
  'partners',
  'video',
  'pricing',
  'join',
  'cta',
]
