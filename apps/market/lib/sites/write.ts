import { one, q } from '@/lib/db'
import { hubDb, usesVitrinaDb } from '@/lib/sb'

type Row = Record<string, unknown>

async function fail(error: { message: string } | null): Promise<void> {
  if (error) throw new Error(error.message)
}

export async function updateSiteRow(id: string, patch: Record<string, unknown>): Promise<Row | null> {
  const next = { ...patch, updated_at: new Date().toISOString() }
  if (usesVitrinaDb()) {
    const { data, error } = await hubDb().from('sites').update(next).eq('id', id).select('*').maybeSingle()
    await fail(error)
    return (data as Row | null) ?? null
  }
  const keys = Object.keys(patch)
  const values = keys.map((key) => {
    const value = patch[key]
    return value && typeof value === 'object' ? JSON.stringify(value) : value
  })
  const sets = keys.map((key, i) => `${key} = $${i + 2}`)
  return one(`UPDATE hub.sites SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`, [
    id,
    ...values,
  ])
}

export async function insertPage(row: {
  site_id: string
  slug: string
  kind: string
  title: Record<string, string>
  sort_order: number
  is_published: boolean
}): Promise<{ id: string } | null> {
  if (usesVitrinaDb()) {
    const { data, error } = await hubDb()
      .from('site_pages')
      .upsert(row, { onConflict: 'site_id,slug' })
      .select('id')
      .maybeSingle()
    await fail(error)
    return data as { id: string } | null
  }
  return one<{ id: string }>(
    `INSERT INTO hub.site_pages (site_id, slug, kind, title, sort_order, is_published)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (site_id, slug) DO UPDATE SET title = EXCLUDED.title, is_published = EXCLUDED.is_published
     RETURNING id`,
    [row.site_id, row.slug, row.kind, JSON.stringify(row.title), row.sort_order, row.is_published]
  )
}

export async function updatePage(
  id: string,
  siteId: string,
  patch: Record<string, unknown>
): Promise<void> {
  if (usesVitrinaDb()) {
    const { error } = await hubDb()
      .from('site_pages')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('site_id', siteId)
    await fail(error)
    return
  }
  const keys = Object.keys(patch)
  const values = [id, siteId, ...keys.map((key) => {
    const value = patch[key]
    return value && typeof value === 'object' ? JSON.stringify(value) : value
  })]
  const sets = keys.map((key, i) => `${key} = $${i + 3}`)
  await q(`UPDATE hub.site_pages SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 AND site_id = $2`, values)
}

export async function deletePage(id: string, siteId: string): Promise<void> {
  if (usesVitrinaDb()) {
    const { error } = await hubDb().from('site_pages').delete().eq('id', id).eq('site_id', siteId)
    await fail(error)
    return
  }
  await q('DELETE FROM hub.site_pages WHERE id = $1 AND site_id = $2', [id, siteId])
}

export async function pageBelongsToSite(pageId: string, siteId: string): Promise<boolean> {
  if (usesVitrinaDb()) {
    const { data, error } = await hubDb()
      .from('site_pages')
      .select('id')
      .eq('id', pageId)
      .eq('site_id', siteId)
      .maybeSingle()
    await fail(error)
    return Boolean(data)
  }
  return Boolean(await one('SELECT id FROM hub.site_pages WHERE id = $1 AND site_id = $2', [pageId, siteId]))
}

export async function nextBlockSort(pageId: string): Promise<number> {
  if (usesVitrinaDb()) {
    const { data, error } = await hubDb()
      .from('site_blocks')
      .select('sort_order')
      .eq('page_id', pageId)
      .order('sort_order', { ascending: false })
      .limit(1)
    await fail(error)
    return Number(data?.[0]?.sort_order ?? 0) + 10
  }
  const row = await one<{ next: number }>(
    'SELECT COALESCE(max(sort_order), 0) + 10 AS next FROM hub.site_blocks WHERE page_id = $1',
    [pageId]
  )
  return Number(row?.next ?? 10)
}

export async function insertBlock(row: {
  page_id: string
  type: string
  payload: Record<string, unknown>
  sort_order: number
}): Promise<{ id: string } | null> {
  if (usesVitrinaDb()) {
    const { data, error } = await hubDb().from('site_blocks').insert(row).select('id').maybeSingle()
    await fail(error)
    return data as { id: string } | null
  }
  return one<{ id: string }>(
    'INSERT INTO hub.site_blocks (page_id, type, payload, sort_order) VALUES ($1, $2, $3, $4) RETURNING id',
    [row.page_id, row.type, JSON.stringify(row.payload), row.sort_order]
  )
}

export async function getBlock(
  id: string,
  siteId: string
): Promise<{ id: string; page_id: string; sort_order: number } | null> {
  if (usesVitrinaDb()) {
    const { data, error } = await hubDb()
      .from('site_blocks')
      .select('id, page_id, sort_order')
      .eq('id', id)
      .maybeSingle()
    await fail(error)
    if (!data) return null
    const belongs = await pageBelongsToSite(String(data.page_id), siteId)
    if (!belongs) return null
    return { id: String(data.id), page_id: String(data.page_id), sort_order: Number(data.sort_order) }
  }
  return one<{ id: string; page_id: string; sort_order: number }>(
    `SELECT b.id, b.page_id, b.sort_order FROM hub.site_blocks b
       JOIN hub.site_pages p ON p.id = b.page_id
      WHERE b.id = $1 AND p.site_id = $2`,
    [id, siteId]
  )
}

export async function updateBlock(id: string, patch: Record<string, unknown>): Promise<void> {
  if (usesVitrinaDb()) {
    const { error } = await hubDb().from('site_blocks').update(patch).eq('id', id)
    await fail(error)
    return
  }
  const keys = Object.keys(patch)
  const values = [id, ...keys.map((key) => {
    const value = patch[key]
    return value && typeof value === 'object' ? JSON.stringify(value) : value
  })]
  const sets = keys.map((key, i) => `${key} = $${i + 2}`)
  await q(`UPDATE hub.site_blocks SET ${sets.join(', ')} WHERE id = $1`, values)
}

export async function neighbourBlock(
  pageId: string,
  sortOrder: number,
  direction: 'up' | 'down'
): Promise<{ id: string; sort_order: number } | null> {
  if (usesVitrinaDb()) {
    let query = hubDb().from('site_blocks').select('id, sort_order').eq('page_id', pageId)
    query = direction === 'up' ? query.lt('sort_order', sortOrder).order('sort_order', { ascending: false }) : query.gt('sort_order', sortOrder).order('sort_order', { ascending: true })
    const { data, error } = await query.limit(1)
    await fail(error)
    const row = data?.[0]
    return row ? { id: String(row.id), sort_order: Number(row.sort_order) } : null
  }
  return one<{ id: string; sort_order: number }>(
    direction === 'up'
      ? `SELECT id, sort_order FROM hub.site_blocks
          WHERE page_id = $1 AND sort_order < $2 ORDER BY sort_order DESC LIMIT 1`
      : `SELECT id, sort_order FROM hub.site_blocks
          WHERE page_id = $1 AND sort_order > $2 ORDER BY sort_order LIMIT 1`,
    [pageId, sortOrder]
  )
}

export async function deleteBlock(id: string): Promise<void> {
  if (usesVitrinaDb()) {
    const { error } = await hubDb().from('site_blocks').delete().eq('id', id)
    await fail(error)
    return
  }
  await q('DELETE FROM hub.site_blocks WHERE id = $1', [id])
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
  if (usesVitrinaDb()) {
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
    await fail(error)
    return data as { id: string } | null
  }
  return one<{ id: string }>(
    `INSERT INTO hub.site_posts (site_id, slug, title, excerpt, body, cover_url, is_published, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $7 THEN now() ELSE NULL END)
     ON CONFLICT (site_id, slug) DO UPDATE SET
       title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, body = EXCLUDED.body,
       cover_url = EXCLUDED.cover_url, is_published = EXCLUDED.is_published, updated_at = now()
     RETURNING id`,
    [
      row.site_id,
      row.slug,
      JSON.stringify(row.title),
      JSON.stringify(row.excerpt),
      JSON.stringify(row.body),
      row.cover_url,
      row.is_published,
    ]
  )
}

export async function updatePost(id: string, siteId: string, patch: Record<string, unknown>): Promise<void> {
  if (usesVitrinaDb()) {
    const { error } = await hubDb()
      .from('site_posts')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('site_id', siteId)
    await fail(error)
    return
  }
  const keys = Object.keys(patch)
  const values = [id, siteId, ...keys.map((key) => {
    const value = patch[key]
    return value && typeof value === 'object' && !(value instanceof Date) ? JSON.stringify(value) : value
  })]
  const sets = keys.map((key, i) => `${key} = $${i + 3}`)
  await q(`UPDATE hub.site_posts SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 AND site_id = $2`, values)
}

export async function deletePost(id: string, siteId: string): Promise<void> {
  if (usesVitrinaDb()) {
    const { error } = await hubDb().from('site_posts').delete().eq('id', id).eq('site_id', siteId)
    await fail(error)
    return
  }
  await q('DELETE FROM hub.site_posts WHERE id = $1 AND site_id = $2', [id, siteId])
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
  if (usesVitrinaDb()) {
    const { data, error } = await hubDb().from('site_manual_cards').insert(row).select('id').maybeSingle()
    await fail(error)
    return data as { id: string } | null
  }
  return one<{ id: string }>(
    `INSERT INTO hub.site_manual_cards
       (site_id, kind, title, body, images, price_from, currency, city_code, external_url, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      row.site_id,
      row.kind,
      JSON.stringify(row.title),
      JSON.stringify(row.body),
      row.images,
      row.price_from,
      row.currency,
      row.city_code,
      row.external_url,
      row.sort_order,
    ]
  )
}

export async function updateManualCard(id: string, siteId: string, patch: Record<string, unknown>): Promise<void> {
  if (usesVitrinaDb()) {
    const { error } = await hubDb().from('site_manual_cards').update(patch).eq('id', id).eq('site_id', siteId)
    await fail(error)
    return
  }
  const keys = Object.keys(patch)
  const values = [id, siteId, ...keys.map((key) => {
    const value = patch[key]
    return value && typeof value === 'object' ? JSON.stringify(value) : value
  })]
  const sets = keys.map((key, i) => `${key} = $${i + 3}`)
  await q(`UPDATE hub.site_manual_cards SET ${sets.join(', ')} WHERE id = $1 AND site_id = $2`, values)
}

export async function deleteManualCard(id: string, siteId: string): Promise<void> {
  if (usesVitrinaDb()) {
    const { error } = await hubDb().from('site_manual_cards').delete().eq('id', id).eq('site_id', siteId)
    await fail(error)
    return
  }
  await q('DELETE FROM hub.site_manual_cards WHERE id = $1 AND site_id = $2', [id, siteId])
}
