import { createAdminClient } from '@/lib/supabase/admin'
import { getI18nText } from '@/lib/i18n/get-text'
import type { SiteKnowledge } from '@/types/site'

export async function loadAssistantKnowledge(siteId: string): Promise<{
  siteKnowledge: SiteKnowledge[]
  baseKnowledge: { title: string; body: string }[]
}> {
  const supabase = createAdminClient()
  const [{ data: siteRows }, { data: baseRows }] = await Promise.all([
    supabase
      .schema('hub')
      .from('site_knowledge')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .schema('hub')
      .from('assistant_base_knowledge')
      .select('title, body')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])

  const siteKnowledge: SiteKnowledge[] = (siteRows ?? []).map((raw) => {
    const row = raw as Record<string, unknown>
    return {
      id: String(row.id),
      site_id: String(row.site_id),
      title: (row.title && typeof row.title === 'object' ? row.title : {}) as SiteKnowledge['title'],
      body: String(row.body ?? ''),
      kind: row.kind === 'faq' || row.kind === 'rule' ? row.kind : 'article',
    }
  })

  const baseKnowledge = (baseRows ?? []).map((row) => ({
    title: getI18nText((row as { title: Record<string, string> }).title, 'ru', ''),
    body: String((row as { body: string }).body ?? ''),
  }))

  return { siteKnowledge, baseKnowledge }
}
