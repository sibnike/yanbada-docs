import { hubDb, throwIf } from '@/lib/sb'

type Row = Record<string, unknown>

export async function updateSiteRow(id: string, patch: Record<string, unknown>): Promise<Row | null> {
  const next = { ...patch, updated_at: new Date().toISOString() }
  const { data, error } = await hubDb().from('sites').update(next).eq('id', id).select('*').maybeSingle()
  throwIf(error)
  return (data as Row | null) ?? null
}

export async function insertPage(row: {
  site_id: string
  slug: string
  kind: string
  title: Record<string, string>
  sort_order: number
  is_published: boolean
}): Promise<{ id: string } | null> {
  const { data, error } = await hubDb()
    .from('site_pages')
    .upsert(row, { onConflict: 'site_id,slug' })
    .select('id')
    .maybeSingle()
  throwIf(error)
  return data as { id: string } | null
}

export async function updatePage(
  id: string,
  siteId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const { error } = await hubDb()
    .from('site_pages')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('site_id', siteId)
  throwIf(error)
}

export async function deletePage(id: string, siteId: string): Promise<void> {
  const { error } = await hubDb().from('site_pages').delete().eq('id', id).eq('site_id', siteId)
  throwIf(error)
}

export async function pageBelongsToSite(pageId: string, siteId: string): Promise<boolean> {
  const { data, error } = await hubDb()
    .from('site_pages')
    .select('id')
    .eq('id', pageId)
    .eq('site_id', siteId)
    .maybeSingle()
  throwIf(error)
  return Boolean(data)
}

export async function nextBlockSort(pageId: string): Promise<number> {
  const { data, error } = await hubDb()
    .from('site_blocks')
    .select('sort_order')
    .eq('page_id', pageId)
    .order('sort_order', { ascending: false })
    .limit(1)
  throwIf(error)
  return Number(data?.[0]?.sort_order ?? 0) + 10
}

export async function insertBlock(row: {
  page_id: string
  type: string
  payload: Record<string, unknown>
  sort_order: number
}): Promise<{ id: string } | null> {
  const { data, error } = await hubDb().from('site_blocks').insert(row).select('id').maybeSingle()
  throwIf(error)
  return data as { id: string } | null
}

export async function getBlock(
  id: string,
  siteId: string
): Promise<{ id: string; page_id: string; sort_order: number } | null> {
  const { data, error } = await hubDb().from('site_blocks').select('id, page_id, sort_order').eq('id', id).maybeSingle()
  throwIf(error)
  if (!data) return null
  const belongs = await pageBelongsToSite(String(data.page_id), siteId)
  if (!belongs) return null
  return { id: String(data.id), page_id: String(data.page_id), sort_order: Number(data.sort_order) }
}

export async function updateBlock(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await hubDb().from('site_blocks').update(patch).eq('id', id)
  throwIf(error)
}

export async function neighbourBlock(
  pageId: string,
  sortOrder: number,
  direction: 'up' | 'down'
): Promise<{ id: string; sort_order: number } | null> {
  let query = hubDb().from('site_blocks').select('id, sort_order').eq('page_id', pageId)
  query =
    direction === 'up'
      ? query.lt('sort_order', sortOrder).order('sort_order', { ascending: false })
      : query.gt('sort_order', sortOrder).order('sort_order', { ascending: true })
  const { data, error } = await query.limit(1)
  throwIf(error)
  const row = data?.[0]
  return row ? { id: String(row.id), sort_order: Number(row.sort_order) } : null
}

export async function deleteBlock(id: string): Promise<void> {
  const { error } = await hubDb().from('site_blocks').delete().eq('id', id)
  throwIf(error)
}

export async function deleteBlocksForPage(pageId: string): Promise<void> {
  const { error } = await hubDb().from('site_blocks').delete().eq('page_id', pageId)
  throwIf(error)
}

export async function findHomePageId(siteId: string): Promise<string | null> {
  const { data, error } = await hubDb()
    .from('site_pages')
    .select('id')
    .eq('site_id', siteId)
    .eq('slug', 'home')
    .maybeSingle()
  throwIf(error)
  return data ? String(data.id) : null
}

export async function insertPost(row: {
  site_id: string
  slug: string
  title: Record<string, string>
  excerpt: Record<string, string>
  body: Record<string, string>
  cover_url: string | null
  is_published: boolean
}): Promise<{ id: string } | null> {
  const { data, error } = await hubDb()
    .from('site_posts')
    .upsert(
      {
        ...row,
        published_at: row.is_published ? new Date().toISOString() : null,
      },
      { onConflict: 'site_id,slug' }
    )
    .select('id')
    .maybeSingle()
  throwIf(error)
  return data as { id: string } | null
}

export async function updatePost(id: string, siteId: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await hubDb()
    .from('site_posts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('site_id', siteId)
  throwIf(error)
}

export async function deletePost(id: string, siteId: string): Promise<void> {
  const { error } = await hubDb().from('site_posts').delete().eq('id', id).eq('site_id', siteId)
  throwIf(error)
}

export async function insertManualCard(row: {
  site_id: string
  kind: string
  title: Record<string, string>
  body: Record<string, string>
  images: string[]
  price_from: number | null
  currency: string | null
  city_code: string | null
  external_url: string | null
  sort_order: number
}): Promise<{ id: string } | null> {
  const { data, error } = await hubDb().from('site_manual_cards').insert(row).select('id').maybeSingle()
  throwIf(error)
  return data as { id: string } | null
}

export async function updateManualCard(id: string, siteId: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await hubDb().from('site_manual_cards').update(patch).eq('id', id).eq('site_id', siteId)
  throwIf(error)
}

export async function deleteManualCard(id: string, siteId: string): Promise<void> {
  const { error } = await hubDb().from('site_manual_cards').delete().eq('id', id).eq('site_id', siteId)
  throwIf(error)
}
