import { createAdminClient } from '@/lib/supabase/admin'
import {
  applyPlacements,
  listingMatchesSiteScope,
  placementIsLive,
  type SiteCompany,
  type SiteListing,
  type SitePlacement,
  type SiteRow,
} from '@/types/site'

const LISTING_SELECT =
  'id, tenant_id, page_slug, title, short_text, marketplace_themes, marketplace_slugs, price_from, price_currency, cover_image_url, images, next_departure_date, seats_left, service_country_code, service_city_codes'

const COMPANY_SELECT =
  'tenant_id, name, city, country, logo_url, cover_photo_url, short_description, about, gallery'

type ListingRow = {
  id: string
  tenant_id: string
  page_slug: string
  title: Record<string, string> | null
  short_text: Record<string, string> | null
  marketplace_themes: string[] | null
  marketplace_slugs: string[] | null
  price_from: number | null
  price_currency: string | null
  cover_image_url: string | null
  images: string[] | null
  next_departure_date: string | null
  seats_left: number | null
  service_country_code: string | null
  service_city_codes: string[] | null
}

type CompanyRow = {
  tenant_id: string
  name: string | null
  city: string | null
  country: string | null
  logo_url: string | null
  cover_photo_url: string | null
  short_description: Record<string, string> | string | null
  about: Record<string, string> | null
  gallery: unknown
}

/**
 * In `approved` mode the placement rows are the source of truth: a paid card
 * stays on the page even if the tenant later edits geo or themes. Scope filters
 * only drive `scope` and `mixed`.
 */
export async function searchSiteListings(
  site: SiteRow,
  placements: SitePlacement[] = [],
  limit = 48
): Promise<{ listings: SiteListing[]; companies: SiteCompany[] }> {
  const supabase = createAdminClient()
  const live = placements.filter((p) => placementIsLive(p))
  const placedListingIds = live
    .map((p) => p.listing_id)
    .filter((id): id is string => typeof id === 'string')
  const placedTenants = Array.from(new Set(live.map((p) => p.tenant_id)))

  if (site.placement_mode === 'approved' && placedListingIds.length === 0) {
    return { listings: [], companies: await loadCompanies(placedTenants) }
  }

  let listingQuery = supabase.schema('hub').from('listing_cache').select(LISTING_SELECT).limit(200)

  if (site.placement_mode === 'approved') {
    listingQuery = listingQuery.in('id', placedListingIds)
  } else {
    if (site.tenant_ids.length > 0) {
      listingQuery = listingQuery.in('tenant_id', site.tenant_ids)
    }
    if (site.theme_slugs.length > 0) {
      listingQuery = listingQuery.overlaps('marketplace_themes', site.theme_slugs)
    }
    if (site.marketplace_slug) {
      listingQuery = listingQuery.contains('marketplace_slugs', [site.marketplace_slug])
    }
  }

  const { data: listingData, error } = await listingQuery
  if (error) {
    console.error('[searchSiteListings]', error.message)
    throw new Error(error.message)
  }

  const rawListings = (listingData ?? []) as ListingRow[]
  const tenantIds = Array.from(
    new Set([...rawListings.map((r) => String(r.tenant_id)), ...placedTenants])
  )
  if (tenantIds.length === 0) return { listings: [], companies: [] }

  const [{ data: tenants }, { data: companies }] = await Promise.all([
    supabase.from('tenants').select('id, name, slug').in('id', tenantIds),
    supabase.schema('hub').from('company_cache').select(COMPANY_SELECT).in('tenant_id', tenantIds),
  ])

  const tenantById = new Map(
    (tenants ?? []).map((t) => [String((t as { id: string }).id), t as { id: string; name: string; slug: string }])
  )
  const companyByTenant = new Map(
    ((companies ?? []) as CompanyRow[]).map((c) => [String(c.tenant_id), c])
  )

  const featured = new Set(site.featured_listing_ids)
  const skipScope = site.placement_mode === 'approved'
  const matched: SiteListing[] = []

  for (const row of rawListings) {
    const company = companyByTenant.get(String(row.tenant_id)) ?? null
    if (
      !skipScope &&
      !listingMatchesSiteScope(
        {
          tenant_id: String(row.tenant_id),
          marketplace_themes: row.marketplace_themes,
          marketplace_slugs: row.marketplace_slugs,
          service_country_code: row.service_country_code,
          service_city_codes: row.service_city_codes,
        },
        company,
        site
      )
    ) {
      continue
    }

    const tenant = tenantById.get(String(row.tenant_id))
    matched.push({
      id: String(row.id),
      tenant_id: String(row.tenant_id),
      tenant_slug: tenant?.slug ?? null,
      tenant_name: tenant?.name ?? company?.name ?? null,
      page_slug: row.page_slug,
      title: row.title && typeof row.title === 'object' ? row.title : {},
      short_text: row.short_text && typeof row.short_text === 'object' ? row.short_text : {},
      cover_image_url: row.cover_image_url,
      images: Array.isArray(row.images) ? row.images.filter((u) => typeof u === 'string') : [],
      price_from: typeof row.price_from === 'number' ? row.price_from : null,
      price_currency: row.price_currency,
      marketplace_themes: row.marketplace_themes ?? [],
      service_country_code: row.service_country_code,
      service_city_codes: row.service_city_codes ?? [],
      next_departure_date: row.next_departure_date,
      seats_left: typeof row.seats_left === 'number' ? row.seats_left : null,
      featured: featured.has(String(row.id)),
    })
  }

  const ordered = applyPlacements(matched, placements, site.placement_mode)
  const sorted =
    site.placement_mode === 'scope'
      ? [...ordered].sort((a, b) => Number(b.featured) - Number(a.featured))
      : ordered
  const listings = sorted.slice(0, limit)

  // Company cards can be placed without any listing, so keep placed tenants too.
  const usedTenantIds = new Set([...listings.map((l) => l.tenant_id), ...placedTenants])
  const companyRows: SiteCompany[] = Array.from(usedTenantIds).map((id) =>
    toCompany(id, companyByTenant.get(id), tenantById.get(id))
  )

  return { listings, companies: companyRows }
}

async function loadCompanies(tenantIds: string[]): Promise<SiteCompany[]> {
  if (tenantIds.length === 0) return []
  const supabase = createAdminClient()
  const [{ data: tenants }, { data: companies }] = await Promise.all([
    supabase.from('tenants').select('id, name, slug').in('id', tenantIds),
    supabase.schema('hub').from('company_cache').select(COMPANY_SELECT).in('tenant_id', tenantIds),
  ])
  const tenantById = new Map(
    (tenants ?? []).map((t) => [String((t as { id: string }).id), t as { id: string; name: string; slug: string }])
  )
  const companyByTenant = new Map(
    ((companies ?? []) as CompanyRow[]).map((c) => [String(c.tenant_id), c])
  )
  return tenantIds.map((id) => toCompany(id, companyByTenant.get(id), tenantById.get(id)))
}

function toCompany(
  tenantId: string,
  company: CompanyRow | undefined,
  tenant: { name: string; slug: string } | undefined
): SiteCompany {
  return {
    tenant_id: tenantId,
    slug: tenant?.slug ?? null,
    name: tenant?.name ?? company?.name ?? null,
    city: company?.city ?? null,
    country: company?.country ?? null,
    logo_url: company?.logo_url ?? null,
    cover_photo_url: company?.cover_photo_url ?? null,
    short_description: company?.short_description ?? null,
    about: company?.about && typeof company.about === 'object' ? company.about : {},
    gallery: company?.gallery ?? [],
  }
}
