import { getActiveSiteBySlug } from '@/lib/sites/get-site'
import { loadSiteManualCards, loadSitePlacements, loadSitePlans } from '@/lib/sites/load-placements'
import { loadSitePages, loadSitePosts } from '@/lib/sites/load-site-content'
import { searchSiteListings } from '@/lib/sites/search-site-listings'
import type { SitePublicPayload } from '@/types/site'
import demoSites from './demo-sites.json'

export async function loadPublicSitePayload(slug: string): Promise<SitePublicPayload | null> {
  const site = await getActiveSiteBySlug(slug)
  if (!site) {
    const demo = (demoSites as { sites: SitePublicPayload[] }).sites.find((s) => s.site.slug === slug)
    return demo ?? null
  }

  const placements = await loadSitePlacements(site.id)
  const [{ listings, companies }, pages, posts, plans, manualCards] = await Promise.all([
    searchSiteListings(site, placements),
    loadSitePages(site.id),
    loadSitePosts(site.id),
    loadSitePlans(site.id),
    loadSiteManualCards(site.id),
  ])

  return { site, listings, companies, pages, posts, plans, manual_cards: manualCards }
}
