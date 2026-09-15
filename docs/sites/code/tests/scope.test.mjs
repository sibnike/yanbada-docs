function listingMatchesSiteScope(listing, company, site) {
  if (site.tenant_ids.length > 0 && !site.tenant_ids.includes(listing.tenant_id)) return false
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
    const hit = wanted.some((c) => codes.includes(c)) || (companyCity ? wanted.includes(companyCity) : false)
    if (!hit) return false
  }
  if (site.marketplace_slug) {
    const slugs = listing.marketplace_slugs ?? []
    if (!slugs.includes(site.marketplace_slug)) return false
  }
  return true
}

const site = {
  tenant_ids: ['t1'],
  theme_slugs: ['tourism'],
  country_codes: ['KZ'],
  city_codes: [],
  marketplace_slug: 'tourhub',
}

const ok = listingMatchesSiteScope(
  {
    tenant_id: 't1',
    marketplace_themes: ['tourism'],
    marketplace_slugs: ['tourhub'],
    service_country_code: 'KZ',
    service_city_codes: ['almaty'],
  },
  { country: 'KZ', city: 'Алматы' },
  site
)

const wrongTenant = listingMatchesSiteScope(
  {
    tenant_id: 't2',
    marketplace_themes: ['tourism'],
    marketplace_slugs: ['tourhub'],
    service_country_code: 'KZ',
    service_city_codes: [],
  },
  { country: 'KZ' },
  site
)

const destOnlyGeo = listingMatchesSiteScope(
  {
    tenant_id: 'any',
    marketplace_themes: ['guides'],
    marketplace_slugs: ['tourhub'],
    service_country_code: 'KZ',
    service_city_codes: ['burabay'],
  },
  { country: 'KZ' },
  {
    tenant_ids: [],
    theme_slugs: ['tourism', 'guides'],
    country_codes: ['KZ'],
    city_codes: [],
    marketplace_slug: 'tourhub',
  }
)

if (!ok) throw new Error('expected matching listing')
if (wrongTenant) throw new Error('expected tenant filter')
if (!destOnlyGeo) throw new Error('expected destination geo+theme match')
console.log('listingMatchesSiteScope ok')
