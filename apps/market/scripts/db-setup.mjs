#!/usr/bin/env node
/**
 * Applies the hub.sites migrations and the Karakol seed to DATABASE_URL.
 *
 * The SQL is not copied here: it is read straight from docs/sites, the same
 * files that go into mega-hub/supabase/migrations.
 *
 *   node scripts/db-setup.mjs --reset --stub   fresh standalone Postgres
 *   node scripts/db-setup.mjs                  Supabase, schema hub already there
 *
 * --stub  adds the mega-vitrina environment (roles, auth.uid, cache tables)
 *         that a plain Postgres does not have. Never run it against Supabase.
 */
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const here = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(here, '..')
const docs = path.resolve(appRoot, '../../docs/sites')

const RESET_SQL = `
DROP SCHEMA IF EXISTS hub CASCADE;
DROP SCHEMA IF EXISTS auth CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP FUNCTION IF EXISTS public.is_platform_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_tenant_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.current_user_tenants() CASCADE;
`

// Two weeks of traffic so the renewal conversation has numbers behind it.
const STATS_SQL = `
INSERT INTO hub.site_card_stats (site_id, placement_id, listing_id, day, impressions, clicks, booking_hits)
SELECT p.site_id, p.id, p.listing_id, d::date,
       40 + (random() * 60)::int,
       3 + (random() * 12)::int,
       (random() * 4)::int
FROM hub.site_placements p
CROSS JOIN generate_series(current_date - 13, current_date, interval '1 day') AS d
WHERE p.status = 'active'
ON CONFLICT (placement_id, day) DO NOTHING;
`

const args = new Set(process.argv.slice(2))
const reset = args.has('--reset')
const stub = args.has('--stub')

await loadEnvFile(path.join(appRoot, '.env.local'))

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local first.')
  process.exit(1)
}

const client = new pg.Client({ connectionString, ssl: sslFor(connectionString) })
await client.connect()

const steps = []
if (reset) steps.push(['reset', RESET_SQL])
if (stub) steps.push([rel('demo/pg-stub.sql'), await sql('demo/pg-stub.sql')])
steps.push(
  [rel('sql/20260909000000_hub_sites.sql'), await sql('sql/20260909000000_hub_sites.sql')],
  [rel('sql/20260909120000_hub_site_builder.sql'), await sql('sql/20260909120000_hub_site_builder.sql')],
  [rel('sql/20260909140000_hub_market_placement.sql'), await sql('sql/20260909140000_hub_market_placement.sql')],
  [rel('demo/karakol-cache.sql'), await sql('demo/karakol-cache.sql')],
  [rel('sql/20260909150000_seed_karakol_market.sql'), await sql('sql/20260909150000_seed_karakol_market.sql')],
  [rel('sql/20260909160000_seed_karakol_operator.sql'), await sql('sql/20260909160000_seed_karakol_operator.sql')],
  ['card stats backfill', STATS_SQL]
)

for (const [name, text] of steps) {
  process.stdout.write(`→ ${name} … `)
  try {
    await client.query(text)
    console.log('ok')
  } catch (error) {
    console.log('failed')
    console.error(error.message)
    await client.end()
    process.exit(1)
  }
}

const { rows } = await client.query(
  `SELECT (SELECT count(*) FROM hub.sites) AS sites,
          (SELECT count(*) FROM hub.site_placements) AS placements,
          (SELECT count(*) FROM hub.site_blocks) AS blocks`
)
console.log(`\nsites: ${rows[0].sites}, placements: ${rows[0].placements}, blocks: ${rows[0].blocks}`)
await client.end()

function rel(file) {
  return path.join('docs/sites', file)
}

async function sql(file) {
  return readFile(path.join(docs, file), 'utf8')
}

function sslFor(url) {
  return /supabase|sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined
}

async function loadEnvFile(file) {
  if (!existsSync(file)) return
  const text = await readFile(file, 'utf8')
  for (const line of text.split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (!match) continue
    const value = match[2].replace(/^["']|["']$/g, '')
    if (!process.env[match[1]]) process.env[match[1]] = value
  }
}
