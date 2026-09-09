import { SiteBuilderClient } from '@/components/sites/site-builder-client'
import { isPlatformAdmin } from '@/lib/auth/current-tenant'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ slug: string }> }

export default async function SiteBuilderPage({ params }: PageProps) {
  if (!(await isPlatformAdmin())) redirect('/login')
  const { slug } = await params
  return <SiteBuilderClient slug={slug} />
}
