import { Pool, types } from 'pg'

// numeric comes back as a string by default, which turns prices into "900.00"
// halfway through the UI. Everything here fits in a double.
types.setTypeParser(1700, (value) => Number(value))
types.setTypeParser(20, (value) => Number(value))

declare global {
  // eslint-disable-next-line no-var
  var __marketPool: Pool | undefined
}

function connectionString(): string {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  return url
}

export function pool(): Pool {
  if (!global.__marketPool) {
    const url = connectionString()
    global.__marketPool = new Pool({
      connectionString: url,
      // Supabase and most managed Postgres require TLS but serve a chain the
      // Node bundle does not know.
      ssl: /supabase|sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.PGPOOL_MAX ?? 5),
    })
  }
  return global.__marketPool
}

export async function q<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await pool().query(text, params)
  return result.rows as T[]
}

export async function one<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await q<T>(text, params)
  return rows[0] ?? null
}

export async function tx<T>(run: (query: typeof q) => Promise<T>): Promise<T> {
  const client = await pool().connect()
  try {
    await client.query('BEGIN')
    const scoped = async <R>(text: string, params: unknown[] = []) =>
      (await client.query(text, params)).rows as R[]
    const result = await run(scoped as typeof q)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
