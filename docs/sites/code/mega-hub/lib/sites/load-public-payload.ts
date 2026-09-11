import { getActiveSiteBySlug } from '@/lib/sites/get-site'
import { loadSiteManualCards, loadSitePlacements, loadSitePlans } from '@/lib/sites/load-placements'
import { loadSitePages, loadSitePosts } from '@/lib/sites/load-site-content'
import { searchSiteListings } from '@/lib/sites/search-site-listings'
import type { SitePublicPayload } from '@/types/site'

export async function loadPublicSitePayload(slug: string): Promise<SitePublicPayload | null> {
  const site = await getActiveSiteBySlug(slug)
  if (!site) return null

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
