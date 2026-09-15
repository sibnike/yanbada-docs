import { publicDb, throwIf } from '@/lib/sb'
import { listSites } from '@/lib/sites/load'
import { loc } from '@/lib/sites/public-copy'
import { LoginForm } from '@/components/cabinet/login-form'

export const dynamic = 'force-dynamic'

export default async function CabinetLogin() {
  const preferred = process.env.DEFAULT_SITE_SLUG || 'visit-karakol'
  const all = await listSites()
  const sites = all.filter((site) => site.slug === preferred)
  const shown = sites.length > 0 ? sites : all.slice(0, 1)
  const tenantIds = Array.from(new Set(shown.flatMap((site) => site.tenant_ids)))
  const { data, error } = tenantIds.length
    ? await publicDb().from('tenants').select('id, name').in('id', tenantIds).order('name')
    : { data: [] as { id: string; name: string }[], error: null }
  throwIf(error)

  const byId = new Map((data ?? []).map((row) => [row.id, row.name]))
  const options = shown.map((site) => ({
    slug: site.slug,
    name: loc(site.settings.display_name, 'ru', loc(site.name, 'ru', site.slug)),
    tenants: site.tenant_ids
      .map((id) => ({ id, name: byId.get(id) ?? id }))
      .filter((row) => row.name),
  }))

  return (
    <main className="login">
      <div className="login__box">
        <h1>Вход в кабинет</h1>
        <p>
          Владелец витрины настраивает страницы и модерирует размещение. Компания видит свои
          карточки, статистику и счета.
        </p>
        <LoginForm sites={options} />
      </div>
    </main>
  )
}
