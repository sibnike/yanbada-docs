import { q } from '@/lib/db'
import { listSites } from '@/lib/sites/load'
import { loc } from '@/lib/sites/public-copy'
import { LoginForm } from '@/components/cabinet/login-form'

export const dynamic = 'force-dynamic'

export default async function CabinetLogin() {
  const sites = await listSites()
  const tenantRows = await q<{ id: string; name: string; site_id: string }>(
    `SELECT DISTINCT t.id, t.name, s.id AS site_id
       FROM hub.sites s
       JOIN public.tenants t
         ON t.id = ANY(s.tenant_ids)
         OR EXISTS (SELECT 1 FROM hub.site_placements p WHERE p.site_id = s.id AND p.tenant_id = t.id)
      ORDER BY t.name`
  )

  const options = sites.map((site) => ({
    slug: site.slug,
    name: loc(site.settings.display_name, 'ru', loc(site.name, 'ru', site.slug)),
    tenants: tenantRows
      .filter((row) => row.site_id === site.id)
      .map((row) => ({ id: row.id, name: row.name })),
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
