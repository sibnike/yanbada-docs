import { NextResponse } from 'next/server'
import { q } from '@/lib/db'
import { readJson, siteOr404 } from '@/lib/api'

export const dynamic = 'force-dynamic'

const COLUMN = {
  impression: 'impressions',
  click: 'clicks',
  booking_hit: 'booking_hits',
} as const

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const site = await siteOr404(slug)
  if (site instanceof NextResponse) return site

  const body = await readJson(request)
  const column = COLUMN[body.event as keyof typeof COLUMN]
  const listingIds = Array.isArray(body.listing_ids)
    ? (body.listing_ids as unknown[]).map(String).filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 60)
    : []
  if (!column || listingIds.length === 0) return NextResponse.json({ ok: true, counted: 0 })

  // One row per placement per day; the counter is bumped, never overwritten.
  const rows = await q<{ id: string }>(
    `INSERT INTO hub.site_card_stats (site_id, placement_id, listing_id, day, ${column})
     SELECT p.site_id, p.id, p.listing_id, current_date, 1
       FROM hub.site_placements p
      WHERE p.site_id = $1 AND p.listing_id = ANY($2::uuid[])
     ON CONFLICT (placement_id, day)
       DO UPDATE SET ${column} = hub.site_card_stats.${column} + 1
     RETURNING id`,
    [site.id, listingIds]
  )

  return NextResponse.json({ ok: true, counted: rows.length })
}
