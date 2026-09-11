import { createAdminClient } from '@/lib/supabase/admin'
import {
  SITE_BLOCK_TYPES,
  type I18nMap,
  type SiteBlock,
  type SiteBlockType,
  type SitePage,
  type SitePageKind,
  type SitePost,
} from '@/types/site'

const BLOCK_TYPES: SiteBlockType[] = SITE_BLOCK_TYPES

function asI18n(raw: unknown): I18nMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: I18nMap = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && v.trim()) out[k] = v
  }
  return out
}

export async function loadSitePages(siteId: string): Promise<SitePage[]> {
  const supabase = createAdminClient()
  const { data: pages, error } = await supabase
    .schema('hub')
    .from('site_pages')
    .select('*')
    .eq('site_id', siteId)
    .eq('is_published', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[loadSitePages]', error.message)
    throw new Error(error.message)
  }

  const pageRows = pages ?? []
  if (pageRows.length === 0) return []

  const pageIds = pageRows.map((p) => String((p as { id: string }).id))
  const { data: blocks, error: blockError } = await supabase
    .schema('hub')
    .from('site_blocks')
    .select('*')
    .in('page_id', pageIds)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (blockError) {
    console.error('[loadSitePages blocks]', blockError.message)
    throw new Error(blockError.message)
  }

  const blocksByPage = new Map<string, SiteBlock[]>()
  for (const raw of blocks ?? []) {
    const row = raw as Record<string, unknown>
    const type = BLOCK_TYPES.includes(row.type as SiteBlockType) ? (row.type as SiteBlockType) : 'info'
    const block: SiteBlock = {
      id: String(row.id),
      page_id: String(row.page_id),
      type,
      payload: rawPayload(row.payload),
      sort_order: Number(row.sort_order) || 0,
    }
    const list = blocksByPage.get(block.page_id) ?? []
    list.push(block)
    blocksByPage.set(block.page_id, list)
  }

  return pageRows.map((raw) => {
    const row = raw as Record<string, unknown>
    const kind: SitePageKind =
      row.kind === 'home' || row.kind === 'blog' || row.kind === 'page' ? row.kind : 'page'
    return {
      id: String(row.id),
      site_id: String(row.site_id),
      slug: String(row.slug),
      kind,
      title: asI18n(row.title),
      sort_order: Number(row.sort_order) || 0,
      is_published: true,
      blocks: blocksByPage.get(String(row.id)) ?? [],
    }
  })
}

export async function loadSitePosts(siteId: string): Promise<SitePost[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('hub')
    .from('site_posts')
    .select('*')
    .eq('site_id', siteId)
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  if (error) {
    console.error('[loadSitePosts]', error.message)
    throw new Error(error.message)
  }

  return (data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>
    return {
      id: String(row.id),
      site_id: String(row.site_id),
      slug: String(row.slug),
      title: asI18n(row.title),
      excerpt: asI18n(row.excerpt),
      body: asI18n(row.body),
      cover_url: typeof row.cover_url === 'string' ? row.cover_url : null,
      published_at: typeof row.published_at === 'string' ? row.published_at : null,
    }
  })
}

function rawPayload(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
}
