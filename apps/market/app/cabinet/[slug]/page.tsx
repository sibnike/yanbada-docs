import { redirect } from 'next/navigation'
import { OwnerCabinet } from '@/components/cabinet/owner-cabinet'
import { getSession } from '@/lib/auth'
import { getSite } from '@/lib/sites/load'
import { loadOwnerDashboard } from '@/lib/sites/dashboard'
import { loc } from '@/lib/sites/public-copy'

export const dynamic = 'force-dynamic'

export default async function OwnerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getSession()
  if (!session || session.site !== slug) redirect('/cabinet')
  if (session.role !== 'owner') redirect(`/cabinet/${slug}/tenant`)

  const site = await getSite(slug)
  if (!site) redirect('/cabinet')

  const data = await loadOwnerDashboard(site)
  return (
    <main>
      <OwnerCabinet data={data} title={loc(site.settings.display_name, 'ru', loc(site.name, 'ru', slug))} />
    </main>
  )
}
