import { createAdminClient } from '@/lib/supabase/admin'
import { parseSiteRow } from '@/lib/sites/parse-site'
import type { SiteRow } from '@/types/site'

export async function getActiveSiteBySlug(slug: string): Promise<SiteRow | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('hub')
    .from('sites')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[getActiveSiteBySlug]', slug, error.message)
    return null
  }
  if (!data) return null
  return parseSiteRow(data as Record<string, unknown>)
}

export async function getSiteByHost(host: string): Promise<SiteRow | null> {
  const normalized = host.trim().toLowerCase().replace(/:\d+$/, '')
  if (!normalized) return null
  const supabase = createAdminClient()

  const byDomain = await supabase
    .schema('hub')
    .from('sites')
    .select('*')
    .eq('is_active', true)
    .eq('custom_domain', normalized)
    .maybeSingle()

  if (byDomain.error) {
    console.error('[getSiteByHost]', host, byDomain.error.message)
    return null
  }
  if (byDomain.data) return parseSiteRow(dataRow(byDomain.data))

  const sub = normalized.split('.')[0]
  if (!sub) return null
  const bySub = await supabase
    .schema('hub')
    .from('sites')
    .select('*')
    .eq('is_active', true)
    .eq('subdomain', sub)
    .maybeSingle()

  if (bySub.error) {
    console.error('[getSiteByHost]', host, bySub.error.message)
    return null
  }
  if (!bySub.data) return null
  return parseSiteRow(dataRow(bySub.data))
}

function dataRow(data: object): Record<string, unknown> {
  return data as Record<string, unknown>
}

export async function listSites(includeInactive = false): Promise<SiteRow[]> {
  const supabase = createAdminClient()
  let query = supabase.schema('hub').from('sites').select('*').order('created_at', { ascending: false })
  if (!includeInactive) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) {
    console.error('[listSites]', error.message)
    throw new Error(error.message)
  }
  return (data ?? []).map((row) => parseSiteRow(row as Record<string, unknown>))
}
