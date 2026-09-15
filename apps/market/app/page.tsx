import { redirect } from 'next/navigation'
import { listSites } from '@/lib/sites/load'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const preferred = process.env.DEFAULT_SITE_SLUG || 'visit-karakol'
  const sites = await listSites()
  const site = sites.find((s) => s.slug === preferred) ?? sites[0]
  if (!site) redirect('/cabinet')
  redirect(`/s/${site.slug}`)
}
