import { NextResponse } from 'next/server'
import { getSession, type Session } from '@/lib/auth'
import { getSite } from '@/lib/sites/load'
import type { SiteRow } from '@/types/site'

export function bad(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export async function siteOr404(slug: string): Promise<SiteRow | NextResponse> {
  const site = await getSite(slug)
  if (!site) return bad('Витрина не найдена', 404)
  return site
}

/** Owner/editor screens. Returns the site plus the session, or an error response. */
export async function ownerContext(
  slug: string
): Promise<{ site: SiteRow; session: Session } | NextResponse> {
  const session = await getSession()
  if (!session || session.role !== 'owner' || session.site !== slug) {
    return bad('Нужен вход владельца витрины', 401)
  }
  const site = await siteOr404(slug)
  if (site instanceof NextResponse) return site
  return { site, session }
}

export async function tenantContext(
  slug: string
): Promise<{ site: SiteRow; session: Session & { tenant: string } } | NextResponse> {
  const session = await getSession()
  if (!session || session.role !== 'tenant' || session.site !== slug || !session.tenant) {
    return bad('Нужен вход компании', 401)
  }
  const site = await siteOr404(slug)
  if (site instanceof NextResponse) return site
  return { site, session: session as Session & { tenant: string } }
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)
}

export function text(value: unknown, max = 2000): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}
