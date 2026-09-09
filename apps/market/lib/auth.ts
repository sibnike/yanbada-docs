import crypto from 'node:crypto'
import { cookies } from 'next/headers'

/**
 * Cabinet sign-in for this standalone build: one shared code plus a signed
 * cookie. Inside mega-hub the same screens sit behind Supabase auth, and the
 * hub.site_members / is_tenant_admin RLS policies do this check in the database.
 */
export type Session = {
  role: 'owner' | 'tenant'
  site: string
  tenant?: string
  name?: string
}

const COOKIE = 'market_session'
const MAX_AGE = 60 * 60 * 12

function secret(): string {
  return process.env.SESSION_SECRET || 'market-dev-secret'
}

function sign(body: string): string {
  return crypto.createHmac('sha256', secret()).update(body).digest('base64url')
}

export function encodeSession(session: Session): string {
  const body = Buffer.from(JSON.stringify(session)).toString('base64url')
  return `${body}.${sign(body)}`
}

export function decodeSession(token: string | undefined): Session | null {
  if (!token) return null
  const [body, mac] = token.split('.')
  if (!body || !mac) return null
  const expected = sign(body)
  if (mac.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Session
  } catch {
    return null
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies()
  return decodeSession(store.get(COOKIE)?.value)
}

export async function setSession(session: Session): Promise<void> {
  const store = await cookies()
  store.set(COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export async function clearSession(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE)
}

export function codeMatches(code: unknown): boolean {
  const expected = process.env.CABINET_CODE || 'karakol'
  return typeof code === 'string' && code.trim() === expected
}
