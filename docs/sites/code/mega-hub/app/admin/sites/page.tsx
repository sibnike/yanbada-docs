import { isPlatformAdmin } from '@/lib/auth/current-tenant'
import { listSites } from '@/lib/sites/get-site'
import { getI18nText } from '@/lib/i18n/get-text'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminSitesPage() {
  if (!(await isPlatformAdmin())) redirect('/login')
  const sites = await listSites(true)

  return (
    <main style={{ padding: '2rem', maxWidth: 920, margin: '0 auto' }}>
      <h1>Тематические сайты</h1>
      <p>Публичный URL: TourHub <code>/s/{'{slug}'}</code>. Не путать с Tenant Hub и mega-hub /m.</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {sites.map((site) => (
          <li
            key={site.id}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '1rem 1.1rem',
              marginBottom: 12,
            }}
          >
            <strong>{getI18nText(site.name, 'ru', site.slug)}</strong>
            <div>
              {site.template} · {site.is_active ? 'active' : 'off'} · /s/{site.slug}
            </div>
            <div style={{ color: '#64748b', fontSize: 14 }}>
              tenants {site.tenant_ids.length} · themes {site.theme_slugs.join(', ') || '—'} · geo{' '}
              {[...site.country_codes, ...site.city_codes].join(', ') || '—'}
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
