import { isPlatformAdmin } from '@/lib/auth/current-tenant'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import type { SiteMemberRole } from '@/types/site'

export type SiteAccess = {
  siteId: string
  slug: string
  role: 'platform' | SiteMemberRole
}

/**
 * A market can be run by a blogger, so platform admin is not the only path in.
 * Returns null when the current user may not manage this market.
 */
export async function getSiteAccess(
  slug: string,
  roles: SiteMemberRole[] = ['owner', 'editor', 'moderator']
): Promise<SiteAccess | null> {
  const admin = createAdminClient()
  const { data: site } = await admin
    .schema('hub')
    .from('sites')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (!site) return null
  const siteId = String((site as { id: string }).id)

  if (await isPlatformAdmin()) {
    return { siteId, slug, role: 'platform' }
  }

  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await admin
    .schema('hub')
    .from('site_members')
    .select('role')
    .eq('site_id', siteId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return null
  const role = String((member as { role: string }).role) as SiteMemberRole
  if (!roles.includes(role)) return null

  return { siteId, slug, role }
}

/** Tenants the current user administers, used to attribute a placement request. */
export async function currentUserTenantIds(): Promise<string[]> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.rpc('current_user_tenants')
  if (error || !Array.isArray(data)) return []
  return data
    .map((row) => (typeof row === 'string' ? row : String((row as { tenant_id?: string }).tenant_id ?? '')))
    .filter(Boolean)
}
