import { redirect } from 'next/navigation'
import { TenantCabinet } from '@/components/cabinet/tenant-cabinet'
import { getSession } from '@/lib/auth'
import { getSite } from '@/lib/sites/load'
import { loadTenantDashboard } from '@/lib/sites/dashboard'

export const dynamic = 'force-dynamic'

export default async function TenantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getSession()
  if (!session || session.site !== slug || session.role !== 'tenant' || !session.tenant) {
    redirect('/cabinet')
  }

  const site = await getSite(slug)
  if (!site) redirect('/cabinet')

  const data = await loadTenantDashboard(site, session.tenant)
  return (
    <main>
      <TenantCabinet data={data} />
    </main>
  )
}
