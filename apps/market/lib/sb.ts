import { createClient } from '@supabase/supabase-js'

export function usesVitrinaDb(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function url(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!value) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  return value
}

function key(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return value
}

export function hubDb() {
  return createClient(url(), key(), {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'hub' },
  })
}

export function publicDb() {
  return createClient(url(), key(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
